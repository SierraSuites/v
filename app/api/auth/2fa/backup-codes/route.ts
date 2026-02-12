/**
 * Backup Codes API Route
 *
 * Handles regeneration of 2FA backup codes
 * Requires password confirmation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateBackupCodes } from '@/lib/auth/two-factor'
import { getIdentifier } from '@/lib/auth/rate-limiting'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to regenerate backup codes' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (!profile.two_factor_enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is not enabled' },
        { status: 400 }
      )
    }

    // Extract request metadata
    const ipAddress = getIdentifier(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // Regenerate backup codes
    const result = await regenerateBackupCodes({
      userId: user.id,
      email: profile.email,
      password,
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message: 'Backup codes have been regenerated. Save them in a safe place.',
    })
  } catch (error) {
    console.error('Backup codes regeneration error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint to check backup codes status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get backup codes count
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('backup_codes, two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      enabled: profile.two_factor_enabled || false,
      remainingCodes: profile.backup_codes?.length || 0,
    })
  } catch (error) {
    console.error('Get backup codes status error:', error)
    return NextResponse.json(
      { error: 'Failed to get backup codes status' },
      { status: 500 }
    )
  }
}
