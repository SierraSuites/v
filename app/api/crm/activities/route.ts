import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contact_id')
    const leadId = searchParams.get('lead_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = supabase
      .from('crm_activities')
      .select('*, contact:crm_contacts(id, full_name, company), lead:crm_leads(id, title)')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: false })

    if (contactId) query = query.eq('contact_id', contactId)
    if (leadId) query = query.eq('lead_id', leadId)
    if (status) query = query.eq('status', status)
    if (type) query = query.eq('activity_type', type)

    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ activities: [] })
      throw error
    }

    return NextResponse.json({ activities: data || [] })
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
    const { activity_type, subject, description, scheduled_date, duration_minutes, priority, status, contact_id, lead_id, outcome } = body

    if (!subject || !activity_type) {
      return NextResponse.json({ error: 'subject and activity_type are required' }, { status: 400 })
    }

    const { data, error } = await supabase.from('crm_activities').insert({
      user_id: user.id,
      activity_type,
      subject,
      description: description || null,
      scheduled_date: scheduled_date || new Date().toISOString(),
      duration_minutes: duration_minutes || null,
      priority: priority || 'normal',
      status: status || 'scheduled',
      contact_id: contact_id || null,
      lead_id: lead_id || null,
      outcome: outcome || null,
      completed_date: status === 'completed' ? new Date().toISOString() : null,
    }).select().single()

    if (error) throw error

    // Update last contact date on the contact
    if (contact_id) {
      await supabase.from('crm_contacts').update({ last_contact_date: new Date().toISOString() }).eq('id', contact_id)
    }

    return NextResponse.json({ activity: data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
