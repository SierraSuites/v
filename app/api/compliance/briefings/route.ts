// ============================================================
// API ROUTE: /api/compliance/briefings
// Handles GET (list briefings) and POST (create briefing)
// SECURITY: Auth required, company-isolated via RLS
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateBriefingSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  briefing_date: z.string().datetime({ offset: true }),
  topic: z.string().min(1, 'Topic is required').max(300),
  description: z.string().max(5000).optional().nullable(),
  hazards_discussed: z.array(z.string().max(200)).optional().nullable(),
  ppe_required: z.array(z.string().max(100)).optional().nullable(),
  attendees: z.array(z.string().max(200)).optional().nullable(),
  attendee_count: z.number().int().min(0).optional().nullable(),
  duration_minutes: z.number().int().min(1).max(480).optional().nullable(),
})

const GetBriefingsQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
})

// ============================================================================
// GET /api/compliance/briefings
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. AUTHENTICATION
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. GET COMPANY ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. VALIDATE QUERY PARAMS
    const searchParams = request.nextUrl.searchParams
    const queryResult = GetBriefingsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: queryResult.error.errors },
        { status: 400 }
      )
    }

    const params = queryResult.data
    const limit = Math.min(parseInt(params.limit || '50'), 100)
    const offset = parseInt(params.offset || '0')

    // 4. BUILD QUERY
    let query = supabase
      .from('safety_briefings')
      .select(`
        id, briefing_date, topic, description, hazards_discussed,
        ppe_required, attendees, attendee_count, duration_minutes,
        created_at, updated_at,
        project:project_id (id, name),
        conducted_by:conducted_by_id (id, full_name)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('briefing_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.project_id) query = query.eq('project_id', params.project_id)
    if (params.start_date) query = query.gte('briefing_date', params.start_date)
    if (params.end_date) query = query.lte('briefing_date', params.end_date)

    const { data: briefings, error, count } = await query

    if (error) {
      console.error('[GET /api/compliance/briefings]', error)
      return NextResponse.json({ error: 'Failed to fetch briefings' }, { status: 500 })
    }

    // 5. LAST 30 DAYS STATS
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: recentCount } = await supabase
      .from('safety_briefings')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .gte('briefing_date', thirtyDaysAgo.toISOString())

    return NextResponse.json({
      data: briefings || [],
      count: count || 0,
      pagination: { limit, offset },
      summary: {
        last30Days: recentCount || 0,
      }
    })

  } catch (error) {
    console.error('[GET /api/compliance/briefings] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST /api/compliance/briefings
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. AUTHENTICATION
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. GET COMPANY ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 3. PARSE & VALIDATE BODY
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = CreateBriefingSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // 4. INSERT BRIEFING
    const { data: briefing, error } = await supabase
      .from('safety_briefings')
      .insert({
        company_id: profile.company_id,
        conducted_by_id: user.id,
        ...data,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/compliance/briefings]', error)
      return NextResponse.json({ error: 'Failed to create briefing' }, { status: 500 })
    }

    return NextResponse.json(
      { data: briefing, message: 'Safety briefing recorded successfully' },
      { status: 201 }
    )

  } catch (error) {
    console.error('[POST /api/compliance/briefings] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
