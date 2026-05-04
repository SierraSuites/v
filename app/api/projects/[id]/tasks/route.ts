export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectPermission(id, 'viewTasks')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tasks: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectPermission(id, 'createEditTasks')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', authResult.userId!)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id:           id,
        project_name:         body.project_name ?? null,
        user_id:              authResult.userId!,
        company_id:           profile.company_id,
        title:                body.title,
        description:          body.description ?? null,
        status:               body.status ?? 'not-started',
        priority:             body.priority ?? null,
        trade:                body.trade ?? 'general',
        phase:                body.phase ?? 'pre-construction',
        assignee_id:          body.assignee_id ?? null,
        assignee_name:        body.assignee_name ?? null,
        assignee_avatar:      body.assignee_avatar ?? null,
        start_date:           body.start_date ?? null,
        due_date:             body.due_date ?? new Date().toISOString().split('T')[0],
        duration:             body.duration ?? 1,
        progress:             body.progress ?? 0,
        estimated_hours:      body.estimated_hours ?? 8,
        actual_hours:         body.actual_hours ?? 0,
        dependencies:         body.dependencies ?? [],
        attachments:          body.attachments ?? 0,
        comments:             body.comments ?? 0,
        location:             body.location ?? null,
        weather_dependent:    body.weather_dependent ?? false,
        weather_buffer:       body.weather_buffer ?? 0,
        inspection_required:  body.inspection_required ?? false,
        inspection_type:      body.inspection_type ?? null,
        crew_size:            body.crew_size ?? 1,
        equipment:            body.equipment ?? [],
        materials:            body.materials ?? [],
        certifications:       body.certifications ?? [],
        safety_protocols:     body.safety_protocols ?? [],
        quality_standards:    body.quality_standards ?? [],
        documentation:        body.documentation ?? [],
        notify_inspector:     body.notify_inspector ?? false,
        client_visibility:    body.client_visibility ?? false,
        design_selection_id:  body.design_selection_id ?? null,
        selection_task_type:  body.selection_task_type ?? null,
        blocking_rfi_id:      body.blocking_rfi_id ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
