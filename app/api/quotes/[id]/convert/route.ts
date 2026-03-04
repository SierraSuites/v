export const dynamic = 'force-dynamic'

// ============================================================
// POST /api/quotes/[id]/convert
// One-click convert an approved quote to a project
// Based on 03_QUOTEHUB_QUALITY.md spec
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth-middleware'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { id } = await params
    const supabase = await createClient()

    // Fetch quote with items and client
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items (*)
      `)
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Must be approved/accepted to convert
    if (quote.status !== 'approved' && quote.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Only approved quotes can be converted to a project' },
        { status: 400 }
      )
    }

    // Prevent double conversion
    if (quote.converted_to_project_id) {
      return NextResponse.json(
        { error: 'This quote has already been converted to a project', project_id: quote.converted_to_project_id },
        { status: 409 }
      )
    }

    // Get user profile for company_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', authData!.user.id)
      .single()

    // Calculate 90 days from today as default end date
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Create project from quote data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: quote.title,
        client: quote.client_name || 'Unknown Client',
        address: quote.project_address || quote.client_address || '',
        country: 'US',
        type: 'commercial',
        description: quote.scope_of_work || `Converted from quote ${quote.quote_number}`,
        status: 'planning',
        progress: 0,
        start_date: startDate,
        end_date: endDate,
        estimated_budget: quote.total_amount,
        spent: 0,
        currency: quote.currency || 'USD',
        user_id: authData!.user.id,
        client_visibility: false,
        is_favorite: false,
      })
      .select()
      .single()

    if (projectError) {
      console.error('[convert quote] Project creation failed:', projectError)
      return NextResponse.json({ error: 'Failed to create project: ' + projectError.message }, { status: 500 })
    }

    // Create project expenses from quote line items as budget breakdown
    const items = quote.quote_items || []
    if (items.length > 0) {
      const expenses = items.map((item: any) => ({
        project_id: project.id,
        category: item.category || 'materials',
        description: item.description,
        amount: 0, // No actual spending yet - these are budget line items
        currency: quote.currency || 'USD',
        date: startDate,
        vendor: null,
        invoice_number: null,
        payment_status: 'pending',
        created_by: authData!.user.id,
      }))

      await supabase.from('project_expenses').insert(expenses)
    }

    // Mark quote as converted
    await supabase
      .from('quotes')
      .update({
        status: 'converted',
        converted_to_project_id: project.id,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      project_id: project.id,
      message: `Quote ${quote.quote_number} successfully converted to project "${project.name}"`,
    }, { status: 201 })

  } catch (err: any) {
    console.error('[convert quote] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
