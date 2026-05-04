export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/expenses
 * List all expenses for a project, with created_by user profile joined.
 * Also returns the project's estimated_budget and currency.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authResult = await requireProjectPermission(id, 'viewBudget')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const [projectRes, expensesRes] = await Promise.all([
      supabase.from('projects').select('estimated_budget, currency').eq('id', id).single(),
      supabase.from('project_expenses').select('*').eq('project_id', id).order('date', { ascending: false }),
    ])

    if (projectRes.error) {
      console.error('[GET /api/projects/:id/expenses] Project fetch error:', projectRes.error)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const expenses = expensesRes.data ?? []

    // Fetch creator profiles separately to avoid FK name assumptions
    const creatorIds = [...new Set(expenses.map((e: any) => e.created_by).filter(Boolean))]
    let profileMap: Record<string, { full_name: string; avatar_url: string }> = {}
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', creatorIds)
      for (const p of profiles ?? []) {
        profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }
      }
    }

    const expensesWithProfiles = expenses.map((e: any) => ({
      ...e,
      created_by_profile: profileMap[e.created_by] ?? null,
    }))

    return NextResponse.json({
      expenses: expensesWithProfiles,
      estimated_budget: projectRes.data.estimated_budget,
      currency: projectRes.data.currency,
    })
  } catch (error) {
    console.error('[GET /api/projects/:id/expenses] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[id]/expenses
 * Create a new expense for a project.
 * The created_by field is set to the authenticated user.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authResult = await requireProjectPermission(id, 'manageBudget')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const body = await request.json()

    const { data: expense, error: insertError } = await supabase
      .from('project_expenses')
      .insert({
        project_id: id,
        category: body.category,
        description: body.description || null,
        amount: body.amount,
        currency: body.currency || 'USD',
        date: body.date,
        vendor: body.vendor || null,
        invoice_number: body.invoice_number || null,
        payment_status: body.payment_status || 'pending',
        created_by: authResult.userId!,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/projects/:id/expenses] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create expense' },
        { status: 500 }
      )
    }

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/projects/:id/expenses] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * PATCH /api/projects/[id]/expenses?expenseId=<uuid>
 * Update fields on an expense (edit or mark-paid).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectPermission(id, 'manageBudget')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const expenseId = searchParams.get('expenseId')
    if (!expenseId) return NextResponse.json({ error: 'Missing expenseId' }, { status: 400 })

    const raw = await request.json()
    const body: Record<string, unknown> = {}
    if (raw.category       !== undefined) body.category       = String(raw.category)
    if (raw.description    !== undefined) body.description    = raw.description ? String(raw.description) : null
    if (raw.amount         !== undefined) body.amount         = Number(raw.amount)
    if (raw.date           !== undefined) body.date           = String(raw.date)
    if (raw.vendor         !== undefined) body.vendor         = raw.vendor ? String(raw.vendor) : null
    if (raw.payment_status !== undefined) {
      const VALID = ['pending', 'paid', 'overdue']
      if (!VALID.includes(raw.payment_status)) return NextResponse.json({ error: 'Invalid payment_status' }, { status: 400 })
      body.payment_status = raw.payment_status
    }
    if (Object.keys(body).length === 0) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })

    const { data, error } = await supabase
      .from('project_expenses')
      .update(body)
      .eq('id', expenseId)
      .eq('project_id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/projects/[id]/expenses?expenseId=<uuid>
 * Delete an expense by its ID.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authResult = await requireProjectPermission(id, 'manageBudget')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const expenseId = searchParams.get('expenseId')

    if (!expenseId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: expenseId' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('project_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('project_id', id)

    if (deleteError) {
      console.error('[DELETE /api/projects/:id/expenses] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete expense' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/projects/:id/expenses] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
