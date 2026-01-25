// API Route Authentication Middleware
// Protects API routes and enforces authentication

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export interface AuthenticatedRequest {
  user: {
    id: string
    email: string
    role?: string
  }
  company_id: string
}

/**
 * Middleware to protect API routes
 * Returns authenticated user and company_id or error response
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ data: AuthenticatedRequest | null; error: NextResponse | null }> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        data: null,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        ),
      }
    }

    // Get user's company_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        data: null,
        error: NextResponse.json(
          { error: 'Forbidden', message: 'User profile not found' },
          { status: 403 }
        ),
      }
    }

    if (!profile.company_id) {
      return {
        data: null,
        error: NextResponse.json(
          { error: 'Forbidden', message: 'User not associated with a company' },
          { status: 403 }
        ),
      }
    }

    // Return authenticated request context
    return {
      data: {
        user: {
          id: user.id,
          email: user.email || '',
          role: profile.role,
        },
        company_id: profile.company_id,
      },
      error: null,
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Internal Server Error', message: 'Authentication check failed' },
        { status: 500 }
      ),
    }
  }
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ data: AuthenticatedRequest | null; error: NextResponse | null }> {
  const { data, error } = await requireAuth(request)

  if (error) return { data: null, error }

  if (!data || (data.user.role !== 'admin' && data.user.role !== 'owner')) {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      ),
    }
  }

  return { data, error: null }
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  // Clean up old records
  if (record && now > record.resetTime) {
    rateLimitStore.delete(identifier)
  }

  const current = rateLimitStore.get(identifier)

  if (!current) {
    // First request in window
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs }
  }

  if (current.count >= maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }

  // Increment count
  current.count++
  rateLimitStore.set(identifier, current)

  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime,
  }
}

/**
 * Apply rate limiting to API route
 */
export function rateLimit(
  request: NextRequest,
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): NextResponse | null {
  const result = checkRateLimit(identifier, maxRequests, windowMs)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        },
      }
    )
  }

  // Add rate limit headers to successful response
  return null // No error, continue with request
}

/**
 * Helper to add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  identifier: string,
  maxRequests: number = 100
): NextResponse {
  const record = rateLimitStore.get(identifier)

  if (record) {
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - record.count).toString())
    response.headers.set('X-RateLimit-Reset', new Date(record.resetTime).toISOString())
  }

  return response
}

/**
 * Validate request body against schema
 */
export function validateBody<T>(
  body: unknown,
  requiredFields: string[]
): { data: T | null; error: NextResponse | null } {
  if (!body || typeof body !== 'object') {
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Bad Request', message: 'Request body is required' },
        { status: 400 }
      ),
    }
  }

  const missingFields = requiredFields.filter((field) => !(field in body))

  if (missingFields.length > 0) {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Bad Request',
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      ),
    }
  }

  return { data: body as T, error: null }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof Error) {
    // Known error types
    if (error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Resource already exists' },
        { status: 409 }
      )
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Resource not found' },
        { status: 404 }
      )
    }
  }

  // Generic error
  return NextResponse.json(
    { error: 'Internal Server Error', message: 'An unexpected error occurred' },
    { status: 500 }
  )
}
