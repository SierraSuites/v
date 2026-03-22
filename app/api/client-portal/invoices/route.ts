/**
 * Client Portal Invoices API
 * GET /api/client-portal/invoices - Get invoices for client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        status,
        subtotal,
        tax_amount,
        total_amount,
        amount_paid,
        balance_due,
        notes,
        contact:crm_contacts(
          id,
          company_name,
          first_name,
          last_name,
          email
        )
      `)
      .eq('company_id', profile.company_id)
      .order('invoice_date', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('[Client Portal Invoices API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary stats
    const summary = {
      total: invoices?.length || 0,
      paid: invoices?.filter(i => i.status === 'paid').length || 0,
      pending: invoices?.filter(i => i.status === 'sent' || i.status === 'viewed').length || 0,
      overdue: invoices?.filter(i => i.status === 'overdue').length || 0,
      total_outstanding: invoices?.reduce((sum, i) => sum + (i.balance_due || 0), 0) || 0,
    }

    return NextResponse.json({ invoices, summary })
  } catch (error: any) {
    console.error('[Client Portal Invoices API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
