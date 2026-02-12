/**
 * 2FA Setup API Route
 *
 * Handles the initial 2FA setup process:
 * - Generate secret and QR code
 * - Verify initial token
 * - Enable 2FA and return backup codes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate2FASecret, enable2FA } from '@/lib/auth/two-factor'
import { getIdentifier } from '@/lib/auth/rate-limiting'

/**
 * POST /api/auth/2fa/setup
 * Step 1: Generate a new 2FA secret and QR code
 */
export async function POST(request: NextRequest) {
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

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if 2FA is already enabled
    if (profile.two_factor_enabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is already enabled' },
        { status: 400 }
      )
    }

    // Generate new secret
    const { secret, qrCodeDataURL, manualEntryKey } = await generate2FASecret({
      userId: user.id,
      email: profile.email,
    })

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataURL,
      manualEntryKey,
      secret, // Temporary - will be stored after verification
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: 'Failed to generate 2FA setup. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/auth/2fa/setup
 * Step 2: Verify token and enable 2FA
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { secret, token } = body

    if (!secret || !token) {
      return NextResponse.json(
        { error: 'Secret and verification token are required' },
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
      .select('email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Extract request metadata
    const ipAddress = getIdentifier(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // Enable 2FA
    const result = await enable2FA({
      userId: user.id,
      email: profile.email,
      secret,
      verificationToken: token,
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message: 'Two-factor authentication has been enabled successfully',
    })
  } catch (error) {
    console.error('2FA enable error:', error)
    return NextResponse.json(
      { error: 'Failed to enable 2FA. Please try again.' },
      { status: 500 }
    )
  }
}
