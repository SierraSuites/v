/**
 * QuickBooks Sync Endpoint
 * POST /api/integrations/quickbooks/sync
 *
 * Syncs invoices and expenses to QuickBooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { refreshAccessToken, validateToken } from '@/lib/integrations/quickbooks/oauth'
import {
  syncInvoiceToQuickBooks,
  syncAllInvoices,
} from '@/lib/integrations/quickbooks/sync-invoices'
import {
  syncExpenseToQuickBooks,
  syncAllExpenses,
} from '@/lib/integrations/quickbooks/sync-expenses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, invoiceId, expenseId } = body

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

    // Get QuickBooks integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('provider', 'quickbooks')
      .eq('status', 'connected')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'QuickBooks not connected. Please connect your QuickBooks account first.' },
        { status: 400 }
      )
    }

    let accessToken = integration.access_token
    const realmId = integration.realm_id

    // Check if token is still valid
    const isValid = await validateToken(accessToken)

    if (!isValid) {
      // Refresh token
      const refreshResult = await refreshAccessToken(integration.refresh_token)

      if (!refreshResult.success) {
        return NextResponse.json(
          {
            error: 'Failed to refresh QuickBooks token. Please reconnect your account.',
            details: refreshResult.error,
          },
          { status: 401 }
        )
      }

      accessToken = refreshResult.accessToken

      // Update tokens in database
      await supabase
        .from('integrations')
        .update({
          access_token: refreshResult.accessToken,
          refresh_token: refreshResult.refreshToken,
          token_expires_at: new Date(
            Date.now() + (refreshResult.expiresIn || 3600) * 1000
          ).toISOString(),
        })
        .eq('id', integration.id)
    }

    // Perform sync action
    let result

    switch (action) {
      case 'sync_invoice':
        if (!invoiceId) {
          return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })
        }
        result = await syncInvoiceToQuickBooks(invoiceId, accessToken, realmId)
        break

      case 'sync_all_invoices':
        result = await syncAllInvoices(profile.company_id, accessToken, realmId)
        break

      case 'sync_expense':
        if (!expenseId) {
          return NextResponse.json({ error: 'Missing expenseId' }, { status: 400 })
        }
        result = await syncExpenseToQuickBooks(expenseId, accessToken, realmId)
        break

      case 'sync_all_expenses':
        result = await syncAllExpenses(profile.company_id, accessToken, realmId)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update last sync timestamp
    await supabase
      .from('integrations')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[QuickBooks Sync] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync with QuickBooks',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
