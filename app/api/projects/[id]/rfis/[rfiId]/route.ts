export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string; rfiId: string }>
}

// PATCH /api/projects/[id]/rfis/[rfiId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, rfiId } = await params
    const authResult = await requireProjectPermission(id, 'respondToRFIs')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const body = await request.json()

    // If adding a response, set responded_at
    const update: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
    if (body.response && !body.responded_at) {
      update.responded_at = new Date().toISOString()
      update.status = 'answered'
    }

    const { data, error } = await supabase
      .from('project_rfis')
      .update(update)
      .eq('id', rfiId)
      .eq('project_id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/rfis/[rfiId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, rfiId } = await params
    // Only roles that can create RFIs can also delete them
    const authResult = await requireProjectPermission(id, 'createRFIs')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { error } = await supabase
      .from('project_rfis')
      .delete()
      .eq('id', rfiId)
      .eq('project_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
