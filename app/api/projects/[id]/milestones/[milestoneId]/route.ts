export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string; milestoneId: string }>
}

const VALID_STATUSES = new Set(['pending', 'in-progress', 'completed', 'cancelled'])

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, milestoneId } = await params
    const authResult = await requireProjectPermission(id, 'editProject')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const raw = await request.json()

    const updates: Record<string, unknown> = {}
    if (raw.name !== undefined)        updates.name        = String(raw.name).trim()
    if (raw.description !== undefined) updates.description = raw.description?.trim() || null
    if (raw.due_date !== undefined)    updates.due_date    = String(raw.due_date)
    if (raw.status !== undefined) {
      if (!VALID_STATUSES.has(raw.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = raw.status
      if (raw.status === 'completed') {
        updates.completed_at = raw.completed_at ?? new Date().toISOString()
      } else if (raw.completed_at === null) {
        updates.completed_at = null
      }
    }

    if (raw.phase_id !== undefined) updates.phase_id = raw.phase_id || null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_milestones')
      .update(updates)
      .eq('id', milestoneId)
      .eq('project_id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ milestone: data })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, milestoneId } = await params
    const authResult = await requireProjectPermission(id, 'editProject')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { error } = await supabase
      .from('project_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
