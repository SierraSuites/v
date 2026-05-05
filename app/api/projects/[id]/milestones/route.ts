export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission, requireProjectAccess } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectAccess(id)
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', id)
      .order('due_date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ milestones: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectPermission(id, 'editProject')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const body = await request.json()

    if (!body.name?.trim() || !body.due_date) {
      return NextResponse.json({ error: 'name and due_date are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_milestones')
      .insert({
        project_id:  id,
        name:        body.name.trim(),
        description: body.description?.trim() || null,
        due_date:    body.due_date,
        status:      body.status ?? 'pending',
        phase_id:    body.phase_id || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ milestone: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
