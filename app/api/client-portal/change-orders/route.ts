/**
 * Client Portal Change Orders API
 * GET /api/client-portal/change-orders - List change orders
 * POST /api/client-portal/change-orders - Create change order request
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
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('change_orders')
      .select(`
        *,
        project:projects(id, name),
        requested_by_user:user_profiles!change_orders_requested_by_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: changeOrders, error } = await query

    if (error) {
      console.error('[Client Portal Change Orders API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ change_orders: changeOrders })
  } catch (error: any) {
    console.error('[Client Portal Change Orders API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      project_id,
      title,
      description,
      proposed_amount,
      proposed_completion_date,
      schedule_impact_days,
      justification,
      attachments,
    } = body

    // Generate change order number
    const { data: coNumber } = await supabase.rpc('generate_change_order_number', {
      p_company_id: profile.company_id,
      p_project_id: project_id,
    })

    // Create change order
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .insert({
        company_id: profile.company_id,
        project_id,
        change_order_number: coNumber || `CO-${Date.now()}`,
        title,
        description,
        proposed_amount,
        proposed_completion_date,
        schedule_impact_days: schedule_impact_days || 0,
        justification,
        attachments: attachments || [],
        status: 'client_review',
        requested_by: user.id,
      })
      .select()
      .single()

    if (coError) {
      console.error('[Client Portal Change Orders API] Create error:', coError)
      return NextResponse.json({ error: coError.message }, { status: 500 })
    }

    return NextResponse.json({ change_order: changeOrder }, { status: 201 })
  } catch (error: any) {
    console.error('[Client Portal Change Orders API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
