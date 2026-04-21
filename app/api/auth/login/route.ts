/**
 * Login API Route
 *
 * Handles user login with comprehensive security:
 * - Rate limiting (5 attempts per 15 minutes)
 * - Brute force protection (progressive delays, account lockout)
 * - Audit logging
 * - IP tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getIdentifier, resetRateLimit } from '@/lib/auth/rate-limiting'
import {
  checkBruteForceProtection,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
} from '@/lib/auth/brute-force-protection'
import { logAuthEvent } from '@/lib/auth/audit-logging'

const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds
const REMEMBER_ME_COOKIE = 'sb-remember-me'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Parse request body
    const body = await request.json()
    const { email, password, rememberMe = false } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Extract request metadata
    const ipAddress = getIdentifier(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // 1. CHECK RATE LIMITING (IP-based)
    const rateLimitResult = await checkRateLimit(email, 'login')

    if (!rateLimitResult.allowed) {
      // Log rate limit violation
      await logAuthEvent({
        email,
        eventType: 'login_failed',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'Rate limit exceeded',
        metadata: {
          locked_until: rateLimitResult.lockoutUntil?.toISOString(),
          reason: 'rate_limit',
        },
      })

      const retryAfter = Math.ceil(
        (rateLimitResult.resetTime.getTime() - Date.now()) / 1000
      )

      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter,
          lockedUntil: rateLimitResult.lockoutUntil?.toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          },
        }
      )
    }

    // 2. CHECK BRUTE FORCE PROTECTION (User account-based)
    const bruteForceResult = await checkBruteForceProtection(email)

    if (!bruteForceResult.allowed) {
      // Account is locked
      await logAuthEvent({
        email,
        eventType: 'login_failed',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'Account locked due to too many failed attempts',
        metadata: {
          locked_until: bruteForceResult.lockedUntil?.toISOString(),
          reason: 'brute_force_protection',
        },
      })

      const minutesRemaining = bruteForceResult.lockedUntil
        ? Math.ceil(
            (bruteForceResult.lockedUntil.getTime() - Date.now()) / (1000 * 60)
          )
        : 15

      return NextResponse.json(
        {
          error: `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes.`,
          accountLocked: true,
          lockedUntil: bruteForceResult.lockedUntil?.toISOString(),
        },
        { status: 423 } // 423 Locked
      )
    }

    // 3. APPLY PROGRESSIVE DELAY (Slow down attacks)
    if (bruteForceResult.shouldDelay && bruteForceResult.shouldDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, bruteForceResult.shouldDelay))
    }

    // 4. ATTEMPT LOGIN
    // Collect cookies Supabase wants to set so we can apply the correct maxAge
    // before writing them to the response.
    const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
            pendingCookies.push(...cookiesToSet)
          },
        },
      }
    )

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data.user) {
      // LOGIN FAILED
      const attemptsRemaining = await recordFailedLoginAttempt(email, ipAddress, userAgent)

      // Return user-friendly error
      let errorMessage = 'Invalid email or password'

      if (signInError?.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in'
      } else if (signInError?.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password'
      }

      return NextResponse.json(
        {
          error: errorMessage,
          attemptsRemaining,
        },
        { status: 401 }
      )
    }

    // 5. LOGIN SUCCESSFUL (Password verified)
    // Check if user has 2FA enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, avatar_url, company_id, two_factor_enabled')
      .eq('id', data.user.id)
      .single()

    if (profile?.two_factor_enabled) {
      // User has 2FA enabled - require verification before completing login
      // Don't record successful login yet or reset rate limit
      return NextResponse.json(
        {
          requires2FA: true,
          userId: data.user.id,
          message: 'Please enter your two-factor authentication code',
        },
        { status: 200 }
      )
    }

    // No 2FA - complete login
    await recordSuccessfulLogin(data.user.id, email, ipAddress, userAgent)

    // Reset rate limiting for this user
    await resetRateLimit(email, 'login')

    const responseTime = Date.now() - startTime

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          ...profile,
        },
        session: {
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
          expires_at: data.session?.expires_at,
        },
        metadata: {
          responseTime,
        },
      },
      { status: 200 }
    )

    // Apply Supabase session cookies with maxAge controlled by rememberMe.
    // rememberMe=true  → persistent 30-day cookie
    // rememberMe=false → session cookie (browser clears on close)
    for (const { name, value, options } of pendingCookies) {
      const cookieOptions: CookieOptions = { ...options }
      if (rememberMe) {
        cookieOptions.maxAge = REMEMBER_ME_MAX_AGE
        delete cookieOptions.expires
      } else {
        // Explicitly remove any expiry so the browser treats it as a session cookie
        delete cookieOptions.maxAge
        delete cookieOptions.expires
      }
      response.cookies.set(name, value, cookieOptions)
    }

    // Store the user's remember-me preference so middleware can maintain
    // the correct maxAge across automatic token refreshes.
    const prefCookieOptions: CookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    }
    if (rememberMe) {
      response.cookies.set(REMEMBER_ME_COOKIE, '1', {
        ...prefCookieOptions,
        maxAge: REMEMBER_ME_MAX_AGE,
      })
    } else {
      // Clear any stale preference from a previous "remember me" session
      response.cookies.set(REMEMBER_ME_COOKIE, '', {
        ...prefCookieOptions,
        maxAge: 0,
      })
    }

    return response
  } catch (error: any) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        error: 'An unexpected error occurred during login. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

// GET endpoint for checking login status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, avatar_url, company_id')
      .eq('id', user.id)
      .single()

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          ...profile,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
