export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectAccess } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string; coId: string }>
}

// PATCH /api/projects/[id]/change-orders/[coId]
// Used to update status (approve, reject, execute) or fields
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, coId } = await params
    const authResult = await requireProjectAccess(id)
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const body = await request.json()

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

    // If CO is being executed, increment project budget by the change amount
    if (body.status === 'executed' && data) {
      const { data: project } = await supabase
        .from('projects')
        .select('estimated_budget')
        .eq('id', id)
        .single()

      if (project) {
        await supabase
          .from('projects')
          .update({
            estimated_budget: project.estimated_budget + (data.change_amount || 0),
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
    const authResult = await requireProjectAccess(id)
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
