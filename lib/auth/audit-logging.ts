/**
 * Authentication Audit Logging
 *
 * Centralized logging for all authentication events including:
 * - Login attempts (success/failure)
 * - Password changes
 * - 2FA events
 * - OAuth connections
 * - Session management
 * - Account security events
 */

import { createClient } from '@/lib/supabase/server'

// All supported auth event types (must match database CHECK constraint)
export type AuthEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'password_changed'
  | 'email_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | 'oauth_connected'
  | 'oauth_disconnected'
  | 'session_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'registration'
  | 'email_verified'

export interface AuthAuditLogEntry {
  userId?: string
  email: string
  eventType: AuthEventType
  ipAddress?: string
  userAgent?: string
  deviceFingerprint?: string
  location?: string
  metadata?: Record<string, any>
  success: boolean
  errorMessage?: string
}

/**
 * Log an authentication event
 *
 * @param entry - Audit log entry details
 */
export async function logAuthEvent(entry: AuthAuditLogEntry): Promise<void> {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('auth_audit_logs').insert({
      user_id: entry.userId || null,
      email: entry.email,
      event_type: entry.eventType,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      device_fingerprint: entry.deviceFingerprint || null,
      location: entry.location || null,
      metadata: entry.metadata || {},
      success: entry.success,
      error_message: entry.errorMessage || null,
    })

    if (error) {
      console.error('Failed to log auth event:', error)
      // Don't throw - logging failures shouldn't break auth flow
    }
  } catch (error) {
    console.error('Exception logging auth event:', error)
  }
}

/**
 * Get audit logs for a specific user
 *
 * @param userId - User ID to fetch logs for
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('auth_audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching audit logs:', error)
    return []
  }
}

/**
 * Get recent failed login attempts for an email
 * Useful for security dashboards
 *
 * @param email - Email address to check
 * @param hoursBack - How many hours to look back
 * @returns Array of failed login entries
 */
export async function getRecentFailedLogins(
  email: string,
  hoursBack: number = 24
): Promise<any[]> {
  const supabase = await createClient()
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - hoursBack)

  try {
    const { data, error } = await supabase
      .from('auth_audit_logs')
      .select('*')
      .eq('email', email)
      .eq('event_type', 'login_failed')
      .gte('created_at', cutoffTime.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch failed logins:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching failed logins:', error)
    return []
  }
}

/**
 * Check for suspicious activity patterns
 * Returns true if suspicious behavior detected
 *
 * @param email - Email to check
 * @returns Suspicious activity detected
 */
export async function detectSuspiciousActivity(
  email: string
): Promise<{
  isSuspicious: boolean
  reasons: string[]
}> {
  const supabase = await createClient()
  const reasons: string[] = []

  try {
    // Check for multiple failed logins from different IPs in last hour
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: recentAttempts } = await supabase
      .from('auth_audit_logs')
      .select('ip_address, event_type')
      .eq('email', email)
      .gte('created_at', oneHourAgo.toISOString())
      .in('event_type', ['login_failed', 'login_success'])

    if (recentAttempts && recentAttempts.length > 0) {
      // Count unique IPs
      const uniqueIps = new Set(
        recentAttempts.map((a) => a.ip_address).filter(Boolean)
      )

      if (uniqueIps.size > 3) {
        reasons.push(`Multiple IPs (${uniqueIps.size}) in last hour`)
      }

      // Count failed attempts
      const failedCount = recentAttempts.filter(
        (a) => a.event_type === 'login_failed'
      ).length

      if (failedCount > 5) {
        reasons.push(`${failedCount} failed login attempts in last hour`)
      }
    }

    // Check for rapid-fire password reset requests
    const { data: resetRequests } = await supabase
      .from('auth_audit_logs')
      .select('created_at')
      .eq('email', email)
      .eq('event_type', 'password_reset_requested')
      .gte('created_at', oneHourAgo.toISOString())

    if (resetRequests && resetRequests.length > 3) {
      reasons.push(`${resetRequests.length} password reset requests in last hour`)
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    }
  } catch (error) {
    console.error('Exception detecting suspicious activity:', error)
    return {
      isSuspicious: false,
      reasons: [],
    }
  }
}

/**
 * Get audit log statistics for security dashboard
 *
 * @param timeRangeHours - Hours to look back
 */
export async function getAuditLogStats(timeRangeHours: number = 24): Promise<{
  totalLogins: number
  failedLogins: number
  successfulLogins: number
  uniqueUsers: number
  passwordResets: number
  accountLockouts: number
}> {
  const supabase = await createClient()
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - timeRangeHours)

  try {
    const { data: logs } = await supabase
      .from('auth_audit_logs')
      .select('event_type, user_id')
      .gte('created_at', cutoffTime.toISOString())

    if (!logs) {
      return {
        totalLogins: 0,
        failedLogins: 0,
        successfulLogins: 0,
        uniqueUsers: 0,
        passwordResets: 0,
        accountLockouts: 0,
      }
    }

    const failedLogins = logs.filter((l) => l.event_type === 'login_failed').length
    const successfulLogins = logs.filter((l) => l.event_type === 'login_success').length
    const passwordResets = logs.filter(
      (l) => l.event_type === 'password_reset_completed'
    ).length
    const accountLockouts = logs.filter((l) => l.event_type === 'account_locked').length
    const uniqueUsers = new Set(logs.map((l) => l.user_id).filter(Boolean)).size

    return {
      totalLogins: failedLogins + successfulLogins,
      failedLogins,
      successfulLogins,
      uniqueUsers,
      passwordResets,
      accountLockouts,
    }
  } catch (error) {
    console.error('Exception getting audit stats:', error)
    return {
      totalLogins: 0,
      failedLogins: 0,
      successfulLogins: 0,
      uniqueUsers: 0,
      passwordResets: 0,
      accountLockouts: 0,
    }
  }
}

/**
 * Log a login attempt (success or failure)
 * Convenience wrapper for common use case
 */
export async function logLoginAttempt(params: {
  email: string
  userId?: string
  success: boolean
  ipAddress?: string
  userAgent?: string
  errorMessage?: string
}): Promise<void> {
  await logAuthEvent({
    userId: params.userId,
    email: params.email,
    eventType: params.success ? 'login_success' : 'login_failed',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success,
    errorMessage: params.errorMessage,
  })
}

/**
 * Log a password change
 */
export async function logPasswordChange(params: {
  userId: string
  email: string
  ipAddress?: string
  userAgent?: string
  isReset?: boolean
}): Promise<void> {
  await logAuthEvent({
    userId: params.userId,
    email: params.email,
    eventType: params.isReset ? 'password_reset_completed' : 'password_changed',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: true,
    metadata: {
      is_reset: params.isReset || false,
    },
  })
}

/**
 * Log OAuth connection/disconnection
 */
export async function logOAuthEvent(params: {
  userId: string
  email: string
  provider: string
  connected: boolean
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await logAuthEvent({
    userId: params.userId,
    email: params.email,
    eventType: params.connected ? 'oauth_connected' : 'oauth_disconnected',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: true,
    metadata: {
      provider: params.provider,
    },
  })
}

/**
 * Log 2FA events
 */
export async function log2FAEvent(params: {
  userId: string
  email: string
  eventType: '2fa_enabled' | '2fa_disabled' | '2fa_verified'
  ipAddress?: string
  userAgent?: string
  success?: boolean
}): Promise<void> {
  await logAuthEvent({
    userId: params.userId,
    email: params.email,
    eventType: params.eventType,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success ?? true,
  })
}
