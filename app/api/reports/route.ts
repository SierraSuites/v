import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('reports')
      .select('*, project:projects(id, name)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type && type !== 'all') query = query.eq('report_type', type)
    if (status && status !== 'all') query = query.eq('status', status)
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ reports: [], count: 0 })
      throw error
    }

    return NextResponse.json({ reports: data || [], count: data?.length || 0 })
  } catch (err: any) {
    console.error('GET /api/reports error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, report_type, project_id, summary, sections, data_snapshot, date_range_start, date_range_end } = body

    if (!title || !report_type) {
      return NextResponse.json({ error: 'title and report_type are required' }, { status: 400 })
    }

    // Generate report number
    const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('created_by', user.id)
    const reportNumber = `RPT-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`

    const { data, error } = await supabase.from('reports').insert({
      created_by: user.id,
      user_id: user.id,
      report_number: reportNumber,
      title,
      report_type,
      project_id: project_id || null,
      summary: summary || null,
      sections: sections || [],
      data_snapshot: data_snapshot || {},
      date_range_start: date_range_start || null,
      date_range_end: date_range_end || null,
      status: 'draft',
      sent_to_client: false,
      client_viewed: false,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ report: data }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/reports error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
