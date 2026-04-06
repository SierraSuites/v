export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectAccess } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/change-orders
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectAccess(id)
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('project_change_orders')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json([])
      }
      console.error('[change-orders] DB error:', error.code, error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('[change-orders GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects/[id]/change-orders
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectAccess(id)
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { title, description, reason, change_amount, days_added } = body

    if (!title || !description || change_amount === undefined) {
      return NextResponse.json({ error: 'title, description, and change_amount are required' }, { status: 400 })
    }

    // Get current project budget for the original_amount
    const { data: project } = await supabase
      .from('projects')
      .select('estimated_budget, end_date')
      .eq('id', id)
      .single()

    // Count existing COs to generate number
    const { count } = await supabase
      .from('project_change_orders')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id)

    const coNumber = `CO-${String((count || 0) + 1).padStart(3, '0')}`

    const { data, error } = await supabase
      .from('project_change_orders')
      .insert({
        project_id: id,
        co_number: coNumber,
        title,
        description,
        reason: reason || null,
        original_amount: project?.estimated_budget || 0,
        change_amount: parseFloat(change_amount),
        days_added: parseInt(days_added) || 0,
        original_end_date: project?.end_date || null,
        status: 'draft',
        created_by: user?.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
