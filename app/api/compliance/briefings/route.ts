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
// DB columns: briefing_date (DATE), work_description, toolbox_talk_topic,
//   hazards_identified TEXT[], topics_covered TEXT[], ppe_required TEXT[],
//   location, emergency_assembly_point, total_attendees, duration_minutes,
//   conducted_by (FK to auth.users)
// ============================================================================

const CreateBriefingSchema = z.object({
  project_id:              z.string().uuid('Invalid project ID'),
  briefing_date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  work_description:        z.string().min(1, 'Work description is required').max(2000),
  toolbox_talk_topic:      z.string().max(255).optional().nullable(),
  location:                z.string().max(500).optional().nullable(),
  emergency_assembly_point: z.string().max(500).optional().nullable(),
  hazards_identified:      z.array(z.string().max(200)).optional().nullable(),
  topics_covered:          z.array(z.string().max(200)).optional().nullable(),
  ppe_required:            z.array(z.string().max(100)).optional().nullable(),
  total_attendees:         z.number().int().min(0).optional().nullable(),
  duration_minutes:        z.number().int().min(1).max(480).optional().nullable(),
})

const GetBriefingsQuerySchema = z.object({
  project_id:  z.string().uuid().optional(),
  start_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit:       z.string().regex(/^\d+$/).optional(),
  offset:      z.string().regex(/^\d+$/).optional(),
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

    // 4. BUILD QUERY — only select columns that exist in the DB schema
    let query = supabase
      .from('safety_briefings')
      .select(`
        id, briefing_date, work_description, toolbox_talk_topic, location,
        emergency_assembly_point, hazards_identified, topics_covered,
        ppe_required, total_attendees, duration_minutes,
        conducted_by, created_at, updated_at,
        project:project_id (id, name)
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

    // 5. LAST 30 DAYS COUNT
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { count: recentCount } = await supabase
      .from('safety_briefings')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .gte('briefing_date', thirtyDaysAgoStr)

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

    // 4. INSERT BRIEFING — column names match DB schema exactly
    const { data: briefing, error } = await supabase
      .from('safety_briefings')
      .insert({
        company_id:   profile.company_id,
        conducted_by: user.id,     // DB column: conducted_by (not conducted_by_id)
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
