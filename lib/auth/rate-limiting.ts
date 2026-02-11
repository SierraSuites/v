/**
 * Rate Limiting Utilities
 *
 * Provides rate limiting functionality to prevent brute force attacks
 * and abuse. Uses database-backed storage for production environments.
 */

import { createClient } from '@/lib/supabase/server'

// Rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    lockoutDurationMs: 60 * 60 * 1000, // 1 hour
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    lockoutDurationMs: 60 * 60 * 1000, // 1 hour
  },
  emailVerification: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 5,
    lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
  },
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  lockoutUntil?: Date
}

interface RateLimitRecord {
  identifier: string
  count: number
  lock_until: string | null
  window_start: string
  updated_at: string
}

/**
 * Check if a request is rate limited
 *
 * @param identifier - Unique identifier for the rate limit (e.g., IP address, email)
 * @param type - Type of rate limit to apply
 * @returns RateLimitResult with allowed status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const config = RATE_LIMITS[type]
  const now = new Date()

  // Create unique key for this rate limit type
  const key = `${type}:${identifier}`

  try {
    // Fetch or create rate limit record
    const { data: record, error } = await supabase
      .from('rate_limit_records')
      .select('*')
      .eq('identifier', key)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Rate limit check error:', error)
      // Fail open - allow request if database is unavailable
      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetTime: new Date(now.getTime() + config.windowMs),
      }
    }

    const existingRecord = record as RateLimitRecord | null

    // Check if currently locked out
    if (existingRecord?.lock_until) {
      const lockoutUntil = new Date(existingRecord.lock_until)
      if (lockoutUntil > now) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: lockoutUntil,
          lockoutUntil,
        }
      }
    }

    // Check if window has expired
    const windowStart = existingRecord
      ? new Date(existingRecord.window_start)
      : now
    const windowExpired = now.getTime() - windowStart.getTime() > config.windowMs

    if (!existingRecord || windowExpired) {
      // Create new window
      await supabase
        .from('rate_limit_records')
        .upsert({
          identifier: key,
          count: 1,
          window_start: now.toISOString(),
          updated_at: now.toISOString(),
          lock_until: null,
        })

      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetTime: new Date(now.getTime() + config.windowMs),
      }
    }

    // Increment count
    const newCount = existingRecord.count + 1

    if (newCount > config.maxAttempts) {
      // Lock out the identifier
      const lockUntil = new Date(now.getTime() + config.lockoutDurationMs)

      await supabase
        .from('rate_limit_records')
        .update({
          count: newCount,
          lock_until: lockUntil.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('identifier', key)

      return {
        allowed: false,
        remaining: 0,
        resetTime: lockUntil,
        lockoutUntil: lockUntil,
      }
    }

    // Update count
    await supabase
      .from('rate_limit_records')
      .update({
        count: newCount,
        updated_at: now.toISOString(),
      })
      .eq('identifier', key)

    return {
      allowed: true,
      remaining: config.maxAttempts - newCount,
      resetTime: new Date(windowStart.getTime() + config.windowMs),
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // Fail open - allow request if something goes wrong
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetTime: new Date(now.getTime() + config.windowMs),
    }
  }
}

/**
 * Reset rate limit for an identifier
 * Useful after successful login or for admin overrides
 */
export async function resetRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<void> {
  const supabase = await createClient()
  const key = `${type}:${identifier}`

  try {
    await supabase
      .from('rate_limit_records')
      .delete()
      .eq('identifier', key)
  } catch (error) {
    console.error('Rate limit reset error:', error)
  }
}

/**
 * Get rate limit status without incrementing
 * Useful for displaying remaining attempts to users
 */
export async function getRateLimitStatus(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const config = RATE_LIMITS[type]
  const now = new Date()
  const key = `${type}:${identifier}`

  try {
    const { data: record } = await supabase
      .from('rate_limit_records')
      .select('*')
      .eq('identifier', key)
      .single()

    const existingRecord = record as RateLimitRecord | null

    if (!existingRecord) {
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetTime: new Date(now.getTime() + config.windowMs),
      }
    }

    // Check lockout
    if (existingRecord.lock_until) {
      const lockoutUntil = new Date(existingRecord.lock_until)
      if (lockoutUntil > now) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: lockoutUntil,
          lockoutUntil,
        }
      }
    }

    const windowStart = new Date(existingRecord.window_start)
    const windowExpired = now.getTime() - windowStart.getTime() > config.windowMs

    if (windowExpired) {
      return {
        allowed: true,
        remaining: config.maxAttempts,
        resetTime: new Date(now.getTime() + config.windowMs),
      }
    }

    return {
      allowed: existingRecord.count < config.maxAttempts,
      remaining: Math.max(0, config.maxAttempts - existingRecord.count),
      resetTime: new Date(windowStart.getTime() + config.windowMs),
    }
  } catch (error) {
    console.error('Rate limit status error:', error)
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetTime: new Date(now.getTime() + config.windowMs),
    }
  }
}

/**
 * Extract identifier from request
 * Uses IP address, email, or combination based on context
 */
export function getIdentifier(request: Request, email?: string): string {
  // Try to get real IP from headers (handles proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  // For email-based endpoints, use email + IP combo for better accuracy
  if (email) {
    return `${email}:${ip}`
  }

  return ip
}
