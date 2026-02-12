/**
 * Two-Factor Authentication (2FA) Utilities
 *
 * Provides TOTP-based two-factor authentication using the OTPAuth library.
 * Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.
 */

import { TOTP, Secret } from 'otpauth'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { log2FAEvent } from './audit-logging'
import crypto from 'crypto'

// 2FA Configuration
const TWO_FACTOR_CONFIG = {
  issuer: 'The Sierra Suites',
  algorithm: 'SHA1' as const,
  digits: 6,
  period: 30, // 30 seconds
  window: 1, // Allow 1 period before/after for clock drift
}

/**
 * Generate a new 2FA secret for a user
 * Returns the secret and QR code data URL
 */
export async function generate2FASecret(params: {
  userId: string
  email: string
}): Promise<{
  secret: string
  qrCodeDataURL: string
  manualEntryKey: string
}> {
  // Generate a random secret
  const secret = new Secret({ size: 20 })

  // Create TOTP instance
  const totp = new TOTP({
    issuer: TWO_FACTOR_CONFIG.issuer,
    label: params.email,
    algorithm: TWO_FACTOR_CONFIG.algorithm,
    digits: TWO_FACTOR_CONFIG.digits,
    period: TWO_FACTOR_CONFIG.period,
    secret,
  })

  // Generate otpauth:// URI
  const otpauthURL = totp.toString()

  // Generate QR code
  const qrCodeDataURL = await QRCode.toDataURL(otpauthURL, {
    errorCorrectionLevel: 'H',
    width: 300,
    margin: 2,
  })

  // Get base32 encoded secret for manual entry
  const manualEntryKey = secret.base32

  return {
    secret: manualEntryKey,
    qrCodeDataURL,
    manualEntryKey,
  }
}

/**
 * Verify a TOTP token against a user's secret
 */
export function verify2FAToken(token: string, secret: string): boolean {
  try {
    // Create TOTP instance with user's secret
    const totp = new TOTP({
      issuer: TWO_FACTOR_CONFIG.issuer,
      algorithm: TWO_FACTOR_CONFIG.algorithm,
      digits: TWO_FACTOR_CONFIG.digits,
      period: TWO_FACTOR_CONFIG.period,
      secret: Secret.fromBase32(secret),
    })

    // Validate the token (allows for clock drift)
    const delta = totp.validate({
      token,
      window: TWO_FACTOR_CONFIG.window,
    })

    // delta is the time step difference, null means invalid
    return delta !== null
  } catch (error) {
    console.error('2FA verification error:', error)
    return false
  }
}

/**
 * Generate backup codes for 2FA recovery
 * Returns 8 random codes
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') || ''

    codes.push(code)
  }

  return codes
}

/**
 * Hash backup codes for storage
 * We store hashed versions to prevent exposure if database is compromised
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/**
 * Verify a backup code against stored hashes
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
  const codeHash = hashBackupCode(code)
  return hashedCodes.includes(codeHash)
}

/**
 * Enable 2FA for a user
 * Stores the secret and backup codes
 */
export async function enable2FA(params: {
  userId: string
  email: string
  secret: string
  verificationToken: string
  ipAddress?: string
  userAgent?: string
}): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  const supabase = await createClient()

  try {
    // Verify the token first
    const isValid = verify2FAToken(params.verificationToken, params.secret)

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid verification code. Please try again.',
      }
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(8)
    const hashedBackupCodes = backupCodes.map(hashBackupCode)

    // Update user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: true,
        two_factor_secret: params.secret,
        two_factor_verified_at: new Date().toISOString(),
        backup_codes: hashedBackupCodes,
      })
      .eq('id', params.userId)

    if (updateError) {
      console.error('Failed to enable 2FA:', updateError)
      return {
        success: false,
        error: 'Failed to enable two-factor authentication. Please try again.',
      }
    }

    // Log the event
    await log2FAEvent({
      userId: params.userId,
      email: params.email,
      eventType: '2fa_enabled',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      success: true,
    })

    return {
      success: true,
      backupCodes,
    }
  } catch (error) {
    console.error('2FA enable error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(params: {
  userId: string
  email: string
  password: string
  ipAddress?: string
  userAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Verify password before disabling
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    })

    if (verifyError) {
      return {
        success: false,
        error: 'Invalid password. Please try again.',
      }
    }

    // Disable 2FA
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_verified_at: null,
        backup_codes: null,
      })
      .eq('id', params.userId)

    if (updateError) {
      console.error('Failed to disable 2FA:', updateError)
      return {
        success: false,
        error: 'Failed to disable two-factor authentication. Please try again.',
      }
    }

    // Log the event
    await log2FAEvent({
      userId: params.userId,
      email: params.email,
      eventType: '2fa_disabled',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      success: true,
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('2FA disable error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Verify 2FA during login
 * Supports both TOTP tokens and backup codes
 */
export async function verify2FAForLogin(params: {
  userId: string
  email: string
  token: string
  ipAddress?: string
  userAgent?: string
}): Promise<{ success: boolean; usedBackupCode?: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Get user's 2FA settings
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('two_factor_secret, two_factor_enabled, backup_codes')
      .eq('id', params.userId)
      .single()

    if (fetchError || !profile) {
      return {
        success: false,
        error: 'Failed to verify code. Please try again.',
      }
    }

    if (!profile.two_factor_enabled || !profile.two_factor_secret) {
      return {
        success: false,
        error: 'Two-factor authentication is not enabled.',
      }
    }

    // First, try TOTP verification
    const totpValid = verify2FAToken(params.token, profile.two_factor_secret)

    if (totpValid) {
      // Log successful verification
      await log2FAEvent({
        userId: params.userId,
        email: params.email,
        eventType: '2fa_verified',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: true,
      })

      return { success: true }
    }

    // If TOTP failed, try backup code
    if (profile.backup_codes && profile.backup_codes.length > 0) {
      const backupCodeValid = verifyBackupCode(
        params.token.replace(/-/g, ''),
        profile.backup_codes
      )

      if (backupCodeValid) {
        // Remove used backup code
        const codeHash = hashBackupCode(params.token.replace(/-/g, ''))
        const remainingCodes = profile.backup_codes.filter((c: string) => c !== codeHash)

        await supabase
          .from('user_profiles')
          .update({ backup_codes: remainingCodes })
          .eq('id', params.userId)

        // Log successful verification
        await log2FAEvent({
          userId: params.userId,
          email: params.email,
          eventType: '2fa_verified',
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          success: true,
        })

        return {
          success: true,
          usedBackupCode: true,
        }
      }
    }

    // Both TOTP and backup code failed
    await log2FAEvent({
      userId: params.userId,
      email: params.email,
      eventType: '2fa_verified',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      success: false,
    })

    return {
      success: false,
      error: 'Invalid verification code. Please try again.',
    }
  } catch (error) {
    console.error('2FA verification error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function check2FAStatus(
  userId: string
): Promise<{
  enabled: boolean
  verifiedAt?: string
  backupCodesRemaining?: number
}> {
  const supabase = await createClient()

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled, two_factor_verified_at, backup_codes')
      .eq('id', userId)
      .single()

    if (!profile) {
      return { enabled: false }
    }

    return {
      enabled: profile.two_factor_enabled || false,
      verifiedAt: profile.two_factor_verified_at || undefined,
      backupCodesRemaining: profile.backup_codes?.length || 0,
    }
  } catch (error) {
    console.error('Check 2FA status error:', error)
    return { enabled: false }
  }
}

/**
 * Regenerate backup codes
 * Requires password verification
 */
export async function regenerateBackupCodes(params: {
  userId: string
  email: string
  password: string
  ipAddress?: string
  userAgent?: string
}): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  const supabase = await createClient()

  try {
    // Verify password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    })

    if (verifyError) {
      return {
        success: false,
        error: 'Invalid password. Please try again.',
      }
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(8)
    const hashedBackupCodes = backupCodes.map(hashBackupCode)

    // Update user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ backup_codes: hashedBackupCodes })
      .eq('id', params.userId)

    if (updateError) {
      return {
        success: false,
        error: 'Failed to regenerate backup codes. Please try again.',
      }
    }

    return {
      success: true,
      backupCodes,
    }
  } catch (error) {
    console.error('Regenerate backup codes error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}
