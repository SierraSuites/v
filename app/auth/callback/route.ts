/**
 * OAuth Callback Handler
 *
 * Handles OAuth callbacks from providers (Google, GitHub, Microsoft)
 * Creates user session and redirects to dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuthEvent } from '@/lib/auth/audit-logging'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=No authorization code received`
    )
  }

  try {
    const supabase = await createClient()

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (!data.user) {
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=Authentication failed`
      )
    }

    // Get OAuth provider info
    const provider = data.user.app_metadata.provider || 'unknown'

    // Log OAuth connection
    await logAuthEvent({
      userId: data.user.id,
      email: data.user.email || 'unknown',
      eventType: 'oauth_connected',
      success: true,
      metadata: {
        provider,
        first_sign_in: data.user.created_at === data.user.last_sign_in_at,
      },
    })

    // Redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`
    )
  }
}
