/**
 * 2FA Verification API Route
 *
 * Handles 2FA verification during login
 * Supports both TOTP tokens and backup codes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verify2FAForLogin } from '@/lib/auth/two-factor'
import { getIdentifier } from '@/lib/auth/rate-limiting'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, token } = body

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'User ID and verification token are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Extract request metadata
    const ipAddress = getIdentifier(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // Verify 2FA token
    const result = await verify2FAForLogin({
      userId,
      email: profile.email,
      token,
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    // If backup code was used, warn user
    if (result.usedBackupCode) {
      // Get remaining backup codes count
      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .select('backup_codes')
        .eq('id', userId)
        .single()

      const remainingCodes = updatedProfile?.backup_codes?.length || 0

      return NextResponse.json({
        success: true,
        usedBackupCode: true,
        remainingBackupCodes: remainingCodes,
        warning:
          remainingCodes === 0
            ? 'You have used your last backup code. Please generate new ones immediately.'
            : `You have ${remainingCodes} backup code${remainingCodes === 1 ? '' : 's'} remaining.`,
      })
    }

    return NextResponse.json({
      success: true,
      message: '2FA verification successful',
    })
  } catch (error) {
    console.error('2FA verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify 2FA code. Please try again.' },
      { status: 500 }
    )
  }
}
