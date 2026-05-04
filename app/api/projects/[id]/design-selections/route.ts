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
      .from('design_selections')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ selections: data ?? [] })
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', authResult.userId!)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
    }

    const body = await request.json()
    if (!body.option_name?.trim()) {
      return NextResponse.json({ error: 'option_name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('design_selections')
      .insert({
        project_id:        id,
        company_id:        profile.company_id,
        created_by:        authResult.userId!,
        category:          body.category ?? 'Other',
        room_location:     body.room_location ?? '',
        option_name:       body.option_name.trim(),
        manufacturer:      body.manufacturer ?? '',
        model:             body.model ?? '',
        sku:               body.sku ?? '',
        color:             body.color ?? '',
        finish:            body.finish ?? '',
        description:       body.description ?? '',
        price:             Number(body.price) || 0,
        installation_cost: Number(body.installation_cost) || 0,
        lead_time_days:    Number(body.lead_time_days) || 0,
        notes:             body.notes ?? '',
        status:            'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ selection: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
