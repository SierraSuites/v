export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string; selectionId: string }>
}

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'ordered', 'received', 'installed'])

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, selectionId } = await params
    const authResult = await requireProjectPermission(id, 'editProject')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const raw = await request.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (raw.category          !== undefined) updates.category          = String(raw.category)
    if (raw.room_location     !== undefined) updates.room_location     = raw.room_location ?? ''
    if (raw.option_name       !== undefined) updates.option_name       = String(raw.option_name).trim()
    if (raw.manufacturer      !== undefined) updates.manufacturer      = raw.manufacturer ?? ''
    if (raw.model             !== undefined) updates.model             = raw.model ?? ''
    if (raw.sku               !== undefined) updates.sku               = raw.sku ?? ''
    if (raw.color             !== undefined) updates.color             = raw.color ?? ''
    if (raw.finish            !== undefined) updates.finish            = raw.finish ?? ''
    if (raw.description       !== undefined) updates.description       = raw.description ?? ''
    if (raw.price             !== undefined) updates.price             = Number(raw.price) || 0
    if (raw.installation_cost !== undefined) updates.installation_cost = Number(raw.installation_cost) || 0
    if (raw.lead_time_days    !== undefined) updates.lead_time_days    = Number(raw.lead_time_days) || 0
    if (raw.notes             !== undefined) updates.notes             = raw.notes ?? ''

    if (raw.status !== undefined) {
      if (!VALID_STATUSES.has(raw.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = raw.status
    }

    // Approval fields — only set when explicitly provided (for client e-signature flow)
    if (raw.client_approved    !== undefined) updates.client_approved    = Boolean(raw.client_approved)
    if (raw.approved_date      !== undefined) updates.approved_date      = raw.approved_date
    if (raw.approved_by_name   !== undefined) updates.approved_by_name   = raw.approved_by_name
    if (raw.approved_by_email  !== undefined) updates.approved_by_email  = raw.approved_by_email

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('design_selections')
      .update(updates)
      .eq('id', selectionId)
      .eq('project_id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ selection: data })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, selectionId } = await params
    const authResult = await requireProjectPermission(id, 'editProject')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    // Cascade-delete linked tasks and expenses (no DB FK cascade on these)
    await Promise.all([
      supabase.from('tasks').delete().eq('design_selection_id', selectionId),
      supabase.from('project_expenses').delete().eq('design_selection_id', selectionId),
    ])

    const { error } = await supabase
      .from('design_selections')
      .delete()
      .eq('id', selectionId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
