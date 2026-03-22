/**
 * Budget Management API
 * GET /api/budgets - List all budgets
 * POST /api/budgets - Create new budget
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

    // Build query
    let query = supabase
      .from('budgets')
      .select(`
        *,
        project:projects(id, name, status),
        budget_items(*)
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: budgets, error } = await query

    if (error) {
      console.error('[Budgets API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate variance for each budget
    const budgetsWithVariance = budgets?.map(budget => {
      const items = budget.budget_items || []
      const totalBudgeted = items.reduce((sum: number, item: any) => sum + (item.budgeted_amount || 0), 0)
      const totalActual = items.reduce((sum: number, item: any) => sum + (item.actual_amount || 0), 0)
      const variance = totalBudgeted - totalActual
      const variancePercent = totalBudgeted > 0 ? ((variance / totalBudgeted) * 100) : 0

      return {
        ...budget,
        total_budgeted: totalBudgeted,
        total_actual: totalActual,
        variance,
        variance_percent: variancePercent,
        utilization_rate: totalBudgeted > 0 ? ((totalActual / totalBudgeted) * 100) : 0
      }
    })

    return NextResponse.json({ budgets: budgetsWithVariance })
  } catch (error: any) {
    console.error('[Budgets API] Error:', error)
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
    const { project_id, name, fiscal_year, start_date, end_date, categories, items } = body

    // Create budget
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .insert({
        company_id: profile.company_id,
        project_id,
        name,
        fiscal_year,
        start_date,
        end_date,
        categories: categories || {},
        created_by: user.id
      })
      .select()
      .single()

    if (budgetError) {
      console.error('[Budgets API] Create error:', budgetError)
      return NextResponse.json({ error: budgetError.message }, { status: 500 })
    }

    // Create budget items if provided
    if (items && items.length > 0) {
      const budgetItems = items.map((item: any) => ({
        budget_id: budget.id,
        company_id: profile.company_id,
        category: item.category,
        subcategory: item.subcategory,
        description: item.description,
        budgeted_amount: item.budgeted_amount,
        actual_amount: item.actual_amount || 0,
        notes: item.notes
      }))

      const { error: itemsError } = await supabase
        .from('budget_items')
        .insert(budgetItems)

      if (itemsError) {
        console.error('[Budgets API] Items error:', itemsError)
        // Don't fail the whole request, budget was created
      }
    }

    return NextResponse.json({ budget }, { status: 201 })
  } catch (error: any) {
    console.error('[Budgets API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
