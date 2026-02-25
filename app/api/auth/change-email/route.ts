/**
 * Email Change API Route
 *
 * Handles email change requests with verification flow:
 * 1. User requests email change (requires password)
 * 2. Verification email sent to NEW email address
 * 3. User clicks verification link
 * 4. Email is updated in auth.users and user_profiles
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuthEvent } from '@/lib/auth/audit-logging'
import { checkRateLimit, getIdentifier } from '@/lib/auth/rate-limiting'

/**
 * POST - Request email change
 * Requires: current password, new email
 * Sends verification email to new address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { newEmail, password } = body

    if (!newEmail || !password) {
      return NextResponse.json(
        { error: 'New email and password are required' },
        { status: 400 }
      )
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(newEmail, 'email_change')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many email change attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const supabase = await createClient()
    const ipAddress = getIdentifier(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (signInError) {
      await logAuthEvent({
        userId: user.id,
        email: user.email || 'unknown',
        eventType: 'email_changed',
        success: false,
        ipAddress,
        userAgent,
        metadata: {
          error: 'Invalid password',
          attempted_new_email: newEmail,
        },
      })

      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Check if new email is already in use
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', newEmail)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email address is already in use' },
        { status: 400 }
      )
    }

    // Update email (Supabase will send verification email)
    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail,
    })

    if (updateError) {
      console.error('Email update error:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    // Log email change request
    await logAuthEvent({
      userId: user.id,
      email: user.email || 'unknown',
      eventType: 'email_changed',
      success: true,
      ipAddress,
      userAgent,
      metadata: {
        old_email: user.email,
        new_email: newEmail,
        status: 'verification_pending',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your new email address to confirm the change.',
    })
  } catch (error: any) {
    console.error('Email change error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * GET - Verify email change
 * Called when user clicks verification link in email
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const token = requestUrl.searchParams.get('token')
    const type = requestUrl.searchParams.get('type')

    if (type !== 'email_change' || !token) {
      return NextResponse.redirect(
        `${requestUrl.origin}/settings/profile?error=Invalid verification link`
      )
    }

    const supabase = await createClient()

    // Verify the token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email_change',
    })

    if (error || !data.user) {
      console.error('Email verification error:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/settings/profile?error=${encodeURIComponent('Email verification failed. The link may have expired.')}`
      )
    }

    // Update user_profiles table
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        email: data.user.email,
      })
      .eq('id', data.user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
    }

    // Log successful email change
    await logAuthEvent({
      userId: data.user.id,
      email: data.user.email || 'unknown',
      eventType: 'email_changed',
      success: true,
      metadata: {
        status: 'completed',
      },
    })

    return NextResponse.redirect(
      `${requestUrl.origin}/settings/profile?success=Email changed successfully`
    )
  } catch (error: any) {
    console.error('Email verification error:', error)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(
      `${requestUrl.origin}/settings/profile?error=An error occurred during verification`
    )
  }
}
