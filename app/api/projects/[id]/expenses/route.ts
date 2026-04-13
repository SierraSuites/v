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

    // Single query: fetch project with embedded expenses (one DB round-trip)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        estimated_budget,
        currency,
        project_expenses (
          *,
          created_by_profile:user_profiles!project_expenses_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', id)
      .order('date', { ascending: false, foreignTable: 'project_expenses' })
      .single()

    if (projectError) {
      console.error('[GET /api/projects/:id/expenses] Project fetch error:', projectError)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      expenses: project.project_expenses ?? [],
      estimated_budget: project.estimated_budget,
      currency: project.currency,
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
