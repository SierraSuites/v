/**
 * 2FA Disable API Route
 *
 * Handles disabling two-factor authentication
 * Requires password confirmation for security
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disable2FA } from '@/lib/auth/two-factor'
import { getIdentifier } from '@/lib/auth/rate-limiting'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to disable 2FA' },
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

    // Disable 2FA
    const result = await disable2FA({
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
      message: 'Two-factor authentication has been disabled',
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA. Please try again.' },
      { status: 500 }
    )
  }
}
