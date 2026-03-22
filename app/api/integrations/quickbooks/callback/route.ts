/**
 * QuickBooks OAuth Callback Endpoint
 * GET /api/integrations/quickbooks/callback
 *
 * Handles the OAuth callback from QuickBooks after user authorization
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/integrations/quickbooks/oauth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const realmId = searchParams.get('realmId') // QuickBooks company ID
    const error = searchParams.get('error')

    // Handle OAuth error
    if (error) {
      console.error('[QuickBooks Callback] OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/integrations/quickbooks?error=${error}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        new URL('/integrations/quickbooks?error=missing_params', request.url)
      )
    }

    // TODO: Validate state to prevent CSRF attacks
    // Parse state to get company_id and user_id
    const [companyId, userId] = state.split(':')

    // Exchange authorization code for access token
    const tokenResult = await getAccessToken(code)

    if (!tokenResult.success) {
      console.error('[QuickBooks Callback] Token exchange failed:', tokenResult.error)
      return NextResponse.redirect(
        new URL(
          `/integrations/quickbooks?error=${encodeURIComponent(tokenResult.error || 'token_exchange_failed')}`,
          request.url
        )
      )
    }

    // Store tokens in database
    const supabase = await createClient()

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('integrations')
      .select('id')
      .eq('company_id', companyId)
      .eq('provider', 'quickbooks')
      .single()

    const integrationData = {
      company_id: companyId,
      provider: 'quickbooks',
      status: 'connected',
      access_token: tokenResult.accessToken,
      refresh_token: tokenResult.refreshToken,
      token_expires_at: new Date(Date.now() + (tokenResult.expiresIn || 3600) * 1000).toISOString(),
      realm_id: realmId,
      last_sync_at: null,
      connected_at: new Date().toISOString(),
      settings: {
        auto_sync: false,
        sync_invoices: true,
        sync_expenses: true,
      },
    }

    if (existingIntegration) {
      // Update existing integration
      await supabase
        .from('integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)
    } else {
      // Create new integration
      await supabase.from('integrations').insert(integrationData)
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'quickbooks_connected',
      resource_type: 'integration',
      resource_id: realmId,
      details: {
        provider: 'quickbooks',
        realm_id: realmId,
      },
    })

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      new URL('/integrations/quickbooks?success=true', request.url)
    )
  } catch (error: any) {
    console.error('[QuickBooks Callback] Unexpected error:', error)
    return NextResponse.redirect(
      new URL(
        `/integrations/quickbooks?error=${encodeURIComponent(error.message || 'unexpected_error')}`,
        request.url
      )
    )
  }
}
