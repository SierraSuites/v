import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const contactId = searchParams.get('contact_id')
    const active = searchParams.get('active') !== 'false'

    let query = supabase
      .from('crm_leads')
      .select('*, contact:crm_contacts(id, full_name, company, email)')
      .eq('user_id', user.id)
      .eq('is_active', active)
      .order('created_at', { ascending: false })

    if (stage) query = query.eq('stage', stage)
    if (contactId) query = query.eq('contact_id', contactId)

    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ leads: [] })
      throw error
    }

    return NextResponse.json({ leads: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, contact_id, description, stage, estimated_value, probability, expected_close_date, lead_source, tags, next_action, next_action_date } = body

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const stageProbMap: Record<string, number> = {
      new: 10, contacted: 25, qualified: 50, proposal_sent: 75, negotiation: 90, won: 100, lost: 0
    }
    const resolvedStage = stage || 'new'
    const resolvedProb = probability ?? stageProbMap[resolvedStage] ?? 10

    const { data, error } = await supabase.from('crm_leads').insert({
      user_id: user.id,
      title,
      contact_id: contact_id || null,
      description: description || null,
      stage: resolvedStage,
      estimated_value: estimated_value || null,
      probability: resolvedProb,
      weighted_value: estimated_value ? (estimated_value * resolvedProb) / 100 : null,
      expected_close_date: expected_close_date || null,
      lead_source: lead_source || null,
      tags: tags || [],
      next_action: next_action || null,
      next_action_date: next_action_date || null,
      is_active: true,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ lead: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
