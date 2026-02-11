/**
 * Brute Force Protection
 *
 * Protects user accounts from brute force password attacks by:
 * 1. Tracking failed login attempts per user
 * 2. Implementing progressive delays
 * 3. Temporary account lockouts
 * 4. Audit logging of suspicious activity
 */

import { createClient } from '@/lib/supabase/server'
import { logAuthEvent } from './audit-logging'

// Brute force protection configuration
const BRUTE_FORCE_CONFIG = {
  maxAttempts: 5,
  lockoutDurationMinutes: 15,
  resetWindowMinutes: 60, // Reset counter after 1 hour of no attempts
  progressiveDelays: [0, 1000, 2000, 5000, 10000], // Delays in ms
} as const

interface BruteForceCheckResult {
  allowed: boolean
  attemptsRemaining: number
  lockedUntil?: Date
  shouldDelay?: number // Milliseconds to delay response
}

interface UserSecurityProfile {
  id: string
  email: string
  failed_login_attempts: number
  locked_until: string | null
  last_failed_login_at: string | null
}

/**
 * Check if user is locked out due to brute force protection
 *
 * @param email - User's email address
 * @returns BruteForceCheckResult with lockout status
 */
export async function checkBruteForceProtection(
  email: string
): Promise<BruteForceCheckResult> {
  const supabase = await createClient()

  try {
    // Get user security profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, email, failed_login_attempts, locked_until, last_failed_login_at')
      .eq('email', email)
      .single()

    if (error || !profile) {
      // User doesn't exist - allow attempt but it will fail at auth level
      return {
        allowed: true,
        attemptsRemaining: BRUTE_FORCE_CONFIG.maxAttempts,
      }
    }

    const userProfile = profile as UserSecurityProfile
    const now = new Date()

    // Check if account is locked
    if (userProfile.locked_until) {
      const lockedUntil = new Date(userProfile.locked_until)
      if (lockedUntil > now) {
        // Account is currently locked
        return {
          allowed: false,
          attemptsRemaining: 0,
          lockedUntil,
        }
      } else {
        // Lock has expired - reset counter
        await resetFailedAttempts(userProfile.id)
        return {
          allowed: true,
          attemptsRemaining: BRUTE_FORCE_CONFIG.maxAttempts,
        }
      }
    }

    // Check if we should reset counter (no attempts in reset window)
    if (userProfile.last_failed_login_at) {
      const lastAttempt = new Date(userProfile.last_failed_login_at)
      const minutesSinceLastAttempt =
        (now.getTime() - lastAttempt.getTime()) / (1000 * 60)

      if (minutesSinceLastAttempt > BRUTE_FORCE_CONFIG.resetWindowMinutes) {
        await resetFailedAttempts(userProfile.id)
        return {
          allowed: true,
          attemptsRemaining: BRUTE_FORCE_CONFIG.maxAttempts,
        }
      }
    }

    // Calculate attempts remaining
    const attemptsRemaining = Math.max(
      0,
      BRUTE_FORCE_CONFIG.maxAttempts - userProfile.failed_login_attempts
    )

    // Calculate progressive delay
    const delayIndex = Math.min(
      userProfile.failed_login_attempts,
      BRUTE_FORCE_CONFIG.progressiveDelays.length - 1
    )
    const shouldDelay = BRUTE_FORCE_CONFIG.progressiveDelays[delayIndex]

    return {
      allowed: attemptsRemaining > 0,
      attemptsRemaining,
      shouldDelay,
    }
  } catch (error) {
    console.error('Brute force check error:', error)
    // Fail open - allow the attempt
    return {
      allowed: true,
      attemptsRemaining: BRUTE_FORCE_CONFIG.maxAttempts,
    }
  }
}

/**
 * Record a failed login attempt
 * Increments counter and locks account if threshold reached
 *
 * @param email - User's email address
 * @param ipAddress - IP address of the attempt
 * @param userAgent - User agent string
 */
export async function recordFailedLoginAttempt(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient()

  try {
    // Get current user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, failed_login_attempts')
      .eq('email', email)
      .single()

    if (!profile) {
      // User doesn't exist - log anyway for security monitoring
      await logAuthEvent({
        email,
        eventType: 'login_failed',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'User not found',
      })
      return
    }

    const newAttemptCount = (profile.failed_login_attempts || 0) + 1
    const now = new Date()

    // Check if we should lock the account
    const shouldLock = newAttemptCount >= BRUTE_FORCE_CONFIG.maxAttempts
    const lockedUntil = shouldLock
      ? new Date(now.getTime() + BRUTE_FORCE_CONFIG.lockoutDurationMinutes * 60 * 1000)
      : null

    // Update user profile
    await supabase
      .from('user_profiles')
      .update({
        failed_login_attempts: newAttemptCount,
        last_failed_login_at: now.toISOString(),
        locked_until: lockedUntil?.toISOString() || null,
      })
      .eq('id', profile.id)

    // Log the event
    await logAuthEvent({
      userId: profile.id,
      email,
      eventType: shouldLock ? 'account_locked' : 'login_failed',
      success: false,
      ipAddress,
      userAgent,
      errorMessage: shouldLock
        ? `Account locked due to ${newAttemptCount} failed attempts`
        : `Failed login attempt ${newAttemptCount}/${BRUTE_FORCE_CONFIG.maxAttempts}`,
      metadata: {
        attempt_count: newAttemptCount,
        locked_until: lockedUntil?.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to record login attempt:', error)
  }
}

/**
 * Record a successful login
 * Resets failed attempt counter
 *
 * @param userId - User's ID
 * @param email - User's email address
 * @param ipAddress - IP address of successful login
 * @param userAgent - User agent string
 */
export async function recordSuccessfulLogin(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient()

  try {
    // Reset failed attempts counter
    await supabase
      .from('user_profiles')
      .update({
        failed_login_attempts: 0,
        last_failed_login_at: null,
        locked_until: null,
      })
      .eq('id', userId)

    // Log successful login
    await logAuthEvent({
      userId,
      email,
      eventType: 'login_success',
      success: true,
      ipAddress,
      userAgent,
      metadata: {
        reset_attempts: true,
      },
    })
  } catch (error) {
    console.error('Failed to record successful login:', error)
  }
}

/**
 * Reset failed login attempts counter
 * Used when lock expires or admin override
 */
async function resetFailedAttempts(userId: string): Promise<void> {
  const supabase = await createClient()

  try {
    await supabase
      .from('user_profiles')
      .update({
        failed_login_attempts: 0,
        last_failed_login_at: null,
        locked_until: null,
      })
      .eq('id', userId)
  } catch (error) {
    console.error('Failed to reset attempts:', error)
  }
}

/**
 * Manually unlock a user account
 * For admin use or support tickets
 *
 * @param userId - User ID to unlock
 * @param adminId - ID of admin performing the unlock
 */
export async function unlockUserAccount(
  userId: string,
  adminId: string
): Promise<void> {
  const supabase = await createClient()

  try {
    // Get user email for logging
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!profile) {
      throw new Error('User not found')
    }

    // Reset lockout
    await resetFailedAttempts(userId)

    // Log the unlock event
    await logAuthEvent({
      userId,
      email: profile.email,
      eventType: 'account_unlocked',
      success: true,
      metadata: {
        unlocked_by: adminId,
        unlock_reason: 'Manual admin unlock',
      },
    })
  } catch (error) {
    console.error('Failed to unlock account:', error)
    throw error
  }
}

/**
 * Get brute force protection status for display
 * Useful for showing users how many attempts remain
 */
export async function getBruteForceStatus(
  email: string
): Promise<{
  attemptsRemaining: number
  isLocked: boolean
  lockedUntil?: Date
}> {
  const result = await checkBruteForceProtection(email)

  return {
    attemptsRemaining: result.attemptsRemaining,
    isLocked: !result.allowed,
    lockedUntil: result.lockedUntil,
  }
}
