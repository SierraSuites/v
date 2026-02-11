/**
 * Registration API Route
 *
 * Handles user registration with security features:
 * - Rate limiting (3 registrations per hour per IP)
 * - Email validation
 * - Password strength requirements
 * - Audit logging
 * - Automatic company and profile creation via trigger
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getIdentifier } from '@/lib/auth/rate-limiting'
import { logAuthEvent } from '@/lib/auth/audit-logging'

// Password strength requirements
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/

interface RegistrationRequest {
  email: string
  password: string
  fullName: string
  phone?: string
  companyName?: string
  selectedPlan?: 'starter' | 'professional' | 'enterprise'
  timezone?: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: RegistrationRequest = await request.json()
    const { email, password, fullName, phone, companyName, selectedPlan, timezone } = body

    // Extract request metadata
    const ipAddress = getIdentifier(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // 1. VALIDATE REQUIRED FIELDS
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    // 2. VALIDATE EMAIL FORMAT
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // 3. VALIDATE PASSWORD STRENGTH
    if (password.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` },
        { status: 400 }
      )
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        {
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        },
        { status: 400 }
      )
    }

    // 4. CHECK RATE LIMITING
    const rateLimitResult = await checkRateLimit(ipAddress, 'register')

    if (!rateLimitResult.allowed) {
      // Log rate limit violation
      await logAuthEvent({
        email,
        eventType: 'registration',
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
          error: 'Too many registration attempts. Please try again later.',
          retryAfter,
          lockedUntil: rateLimitResult.lockoutUntil?.toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          },
        }
      )
    }

    // 5. CREATE USER WITH SUPABASE
    const supabase = await createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login?verified=true`,
        data: {
          full_name: fullName,
          phone: phone || null,
          company_name: companyName || 'My Company',
          selected_plan: selectedPlan || 'starter',
          timezone: timezone || 'America/New_York',
        },
      },
    })

    if (signUpError) {
      // Log failed registration
      await logAuthEvent({
        email,
        eventType: 'registration',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: signUpError.message,
      })

      // Return user-friendly error
      let errorMessage = signUpError.message

      if (signUpError.message.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.'
      } else if (signUpError.message.includes('Password should be')) {
        errorMessage = 'Password does not meet security requirements'
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Failed to create user account. Please try again.' },
        { status: 500 }
      )
    }

    // 6. SUCCESS - Registration completed
    // Note: The handle_new_user() trigger will:
    // - Create company
    // - Create user_profile
    // - Assign admin role
    // - Log registration event

    // Check if email confirmation is required
    const requiresEmailConfirmation = !data.session

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        requiresEmailConfirmation,
        message: requiresEmailConfirmation
          ? 'Registration successful! Please check your email to verify your account.'
          : 'Registration successful! You are now logged in.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)

    return NextResponse.json(
      {
        error: 'An unexpected error occurred during registration. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

// OPTIONS endpoint for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
