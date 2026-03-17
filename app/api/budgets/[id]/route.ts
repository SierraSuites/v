/**
 * Individual Budget API
 * GET /api/budgets/[id] - Get budget details
 * PUT /api/budgets/[id] - Update budget
 * DELETE /api/budgets/[id] - Delete budget
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get budget with all related data
    const { data: budget, error } = await supabase
      .from('budgets')
      .select(`
        *,
        project:projects(id, name, status, start_date, end_date),
        budget_items(*)
      `)
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      console.error('[Budget API] Fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Calculate detailed variance by category
    const items = budget.budget_items || []
    const totalBudgeted = items.reduce((sum: number, item: any) => sum + (item.budgeted_amount || 0), 0)
    const totalActual = items.reduce((sum: number, item: any) => sum + (item.actual_amount || 0), 0)
    const variance = totalBudgeted - totalActual
    const variancePercent = totalBudgeted > 0 ? ((variance / totalBudgeted) * 100) : 0

    // Group by category for breakdown
    const categoryBreakdown = items.reduce((acc: any, item: any) => {
      const category = item.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = {
          budgeted: 0,
          actual: 0,
          variance: 0,
          variancePercent: 0,
          items: [],
        }
      }
      acc[category].budgeted += item.budgeted_amount || 0
      acc[category].actual += item.actual_amount || 0
      acc[category].items.push(item)
      return acc
    }, {})

    // Calculate variance for each category
    Object.keys(categoryBreakdown).forEach(category => {
      const cat = categoryBreakdown[category]
      cat.variance = cat.budgeted - cat.actual
      cat.variancePercent = cat.budgeted > 0 ? ((cat.variance / cat.budgeted) * 100) : 0
    })

    // Calculate burn rate (assuming monthly)
    let burnRate = 0
    let forecastedCompletion = null
    if (budget.start_date && totalBudgeted > 0) {
      const startDate = new Date(budget.start_date)
      const now = new Date()
      const monthsElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (monthsElapsed > 0) {
        burnRate = totalActual / monthsElapsed
        const remainingBudget = totalBudgeted - totalActual
        const monthsRemaining = remainingBudget > 0 ? remainingBudget / burnRate : 0
        forecastedCompletion = new Date(now.getTime() + monthsRemaining * 30 * 24 * 60 * 60 * 1000)
      }
    }

    const budgetWithAnalysis = {
      ...budget,
      total_budgeted: totalBudgeted,
      total_actual: totalActual,
      variance,
      variance_percent: variancePercent,
      utilization_rate: totalBudgeted > 0 ? ((totalActual / totalBudgeted) * 100) : 0,
      burn_rate: burnRate,
      forecasted_completion: forecastedCompletion,
      category_breakdown: categoryBreakdown,
      items_count: items.length,
      at_risk: variancePercent < -10, // Flag if over budget by 10%+
    }

    return NextResponse.json({ budget: budgetWithAnalysis })
  } catch (error: any) {
    console.error('[Budget API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { name, fiscal_year, start_date, end_date, categories, items } = body

    // Update budget
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .update({
        name,
        fiscal_year,
        start_date,
        end_date,
        categories: categories || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .select()
      .single()

    if (budgetError) {
      console.error('[Budget API] Update error:', budgetError)
      return NextResponse.json({ error: budgetError.message }, { status: 500 })
    }

    // Update budget items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await supabase
        .from('budget_items')
        .delete()
        .eq('budget_id', params.id)

      // Insert new items
      if (items.length > 0) {
        const budgetItems = items.map((item: any) => ({
          budget_id: params.id,
          company_id: profile.company_id,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          budgeted_amount: item.budgeted_amount,
          actual_amount: item.actual_amount || 0,
          notes: item.notes,
        }))

        const { error: itemsError } = await supabase
          .from('budget_items')
          .insert(budgetItems)

        if (itemsError) {
          console.error('[Budget API] Items update error:', itemsError)
        }
      }
    }

    return NextResponse.json({ budget })
  } catch (error: any) {
    console.error('[Budget API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Delete budget (cascade will delete items)
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', params.id)
      .eq('company_id', profile.company_id)

    if (error) {
      console.error('[Budget API] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Budget API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
