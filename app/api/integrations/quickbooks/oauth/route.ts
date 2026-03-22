/**
 * QuickBooks OAuth Initiation Endpoint
 * GET /api/integrations/quickbooks/oauth
 *
 * Initiates the OAuth flow by redirecting to QuickBooks authorization page
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizationUrl } from '@/lib/integrations/quickbooks/oauth'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Generate random state for CSRF protection
    const state = `${profile.company_id}:${user.id}:${Date.now()}`

    // Store state in session/database for verification
    // TODO: Store state in database or encrypted cookie

    // Get authorization URL
    const authUrl = getAuthorizationUrl(state)

    // Redirect to QuickBooks authorization page
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('[QuickBooks OAuth] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to initiate QuickBooks authorization',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
