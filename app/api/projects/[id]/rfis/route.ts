export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectAccess } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/rfis
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectAccess(id)
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('project_rfis')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return NextResponse.json([])
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('[rfis GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects/[id]/rfis
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectAccess(id)
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { subject, question, priority, due_date, assigned_to, drawing_references, spec_references } = body

    if (!subject || !question) {
      return NextResponse.json({ error: 'subject and question are required' }, { status: 400 })
    }

    // Generate RFI number
    const { count } = await supabase
      .from('project_rfis')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id)

    const rfiNumber = `RFI-${String((count || 0) + 1).padStart(3, '0')}`

    const { data, error } = await supabase
      .from('project_rfis')
      .insert({
        project_id: id,
        rfi_number: rfiNumber,
        subject,
        question,
        priority: priority || 'medium',
        due_date: due_date || null,
        assigned_to: assigned_to || null,
        drawing_references: drawing_references || [],
        spec_references: spec_references || [],
        status: 'open',
        requested_by: user?.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
