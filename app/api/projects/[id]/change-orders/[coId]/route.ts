export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string; coId: string }>
}

// PATCH /api/projects/[id]/change-orders/[coId]
// Used to update status (approve, reject, execute) or fields
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, coId } = await params
    // Approving/executing requires approveChangeOrders; edits require manageChangeOrders.
    // We use approveChangeOrders as the gate since it implies manage access too.
    const authResult = await requireProjectPermission(id, 'approveChangeOrders')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const raw = await request.json()

    // Whitelist permitted fields — never let callers overwrite co_number, project_id, created_by, etc.
    const body: Record<string, unknown> = {}
    if (raw.title       !== undefined) body.title        = String(raw.title)
    if (raw.description !== undefined) body.description  = String(raw.description)
    if (raw.reason      !== undefined) body.reason       = raw.reason ? String(raw.reason) : null
    if (raw.change_amount !== undefined) body.change_amount = Number(raw.change_amount)
    if (raw.days_added  !== undefined) body.days_added   = Number(raw.days_added)
    if (raw.status      !== undefined) {
      const VALID_STATUSES = ['draft','pending_client','client_approved','client_rejected','executed','cancelled']
      if (!VALID_STATUSES.includes(raw.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }
      body.status = raw.status
    }

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Fetch current CO state before updating (needed for reversal logic)
    const { data: currentCO } = await supabase
      .from('project_change_orders')
      .select('status, change_amount, days_added')
      .eq('id', coId)
      .eq('project_id', id)
      .single()

    const { data, error } = await supabase
      .from('project_change_orders')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', coId)
      .eq('project_id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const wasExecuted = currentCO?.status === 'executed'
    const isNowExecuted = body.status === 'executed'
    const changeAmount = data?.change_amount || 0
    const daysAdded = data?.days_added || 0

    // Apply or reverse budget + timeline adjustments when execution status changes
    if ((isNowExecuted && !wasExecuted) || (!isNowExecuted && wasExecuted && body.status)) {
      const { data: project } = await supabase
        .from('projects')
        .select('estimated_budget, end_date')
        .eq('id', id)
        .single()

      if (project) {
        const budgetDelta = isNowExecuted ? changeAmount : -changeAmount
        const daysDelta   = isNowExecuted ? daysAdded    : -daysAdded

        const newEndDate = daysDelta !== 0
          ? new Date(new Date(project.end_date).getTime() + daysDelta * 86400000).toISOString().split('T')[0]
          : project.end_date

        await supabase
          .from('projects')
          .update({
            estimated_budget: project.estimated_budget + budgetDelta,
            end_date: newEndDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/change-orders/[coId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, coId } = await params
    const authResult = await requireProjectPermission(id, 'manageChangeOrders')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { error } = await supabase
      .from('project_change_orders')
      .delete()
      .eq('id', coId)
      .eq('project_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
