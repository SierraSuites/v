export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>
}

const UPDATABLE_FIELDS = new Set([
  'title', 'description', 'status', 'priority', 'trade', 'phase',
  'assignee_id', 'assignee_name', 'assignee_avatar',
  'start_date', 'due_date', 'duration', 'progress',
  'estimated_hours', 'actual_hours', 'dependencies',
  'location', 'weather_dependent', 'weather_buffer',
  'inspection_required', 'inspection_type',
  'crew_size', 'equipment', 'materials', 'certifications',
  'safety_protocols', 'quality_standards', 'client_visibility',
  'blocking_rfi_id',
])

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, taskId } = await params
    const authResult = await requireProjectPermission(id, 'createEditTasks')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const raw = await request.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const [key, val] of Object.entries(raw)) {
      if (UPDATABLE_FIELDS.has(key)) updates[key] = val
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('project_id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, taskId } = await params
    const authResult = await requireProjectPermission(id, 'deleteTasks')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
