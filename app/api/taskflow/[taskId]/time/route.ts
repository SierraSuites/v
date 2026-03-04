import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ taskId: string }>
}

// GET — list time entries for a task
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('task_time_entries')
    .select('id, started_at, ended_at, duration_minutes, notes, is_billable, user_id')
    .eq('task_id', taskId)
    .order('started_at', { ascending: false })
    .limit(50)

  if (error?.code === '42P01') return NextResponse.json({ data: [] }) // table not yet created
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data || [] })
}

// POST — start a new timer (stops any existing running timer for this user on this task)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Stop any running timers for this user on this task first
  await supabase
    .from('task_time_entries')
    .update({ ended_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .eq('user_id', user.id)
    .is('ended_at', null)

  // Start a new timer
  const { data, error } = await supabase
    .from('task_time_entries')
    .insert({
      task_id: taskId,
      user_id: user.id,
      started_at: new Date().toISOString(),
      is_billable: true,
    })
    .select()
    .single()

  if (error?.code === '42P01') {
    return NextResponse.json(
      { error: 'Time tracking is not yet configured. Run the DB migrations first.' },
      { status: 503 }
    )
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, message: 'Timer started' })
}

// PATCH — stop the running timer
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { taskId } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('task_time_entries')
    .update({
      ended_at: new Date().toISOString(),
      notes: body.notes ?? null,
    })
    .eq('task_id', taskId)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .select()

  if (error?.code === '42P01') return NextResponse.json({ data: [] })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, message: 'Timer stopped' })
}
