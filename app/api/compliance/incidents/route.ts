// ============================================================
// API ROUTE: /api/compliance/incidents
// Handles GET (list incidents) and POST (create incident)
// SECURITY: Auth required, company-isolated via RLS
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateIncidentSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  occurred_at: z.string().datetime({ offset: true }),
  location: z.string().min(1, 'Location is required').max(500),
  severity: z.enum(['near_miss', 'first_aid', 'medical_treatment', 'recordable', 'lost_time', 'fatality']),
  is_osha_recordable: z.boolean().default(false),
  is_dart_case: z.boolean().default(false),
  injury_type: z.string().max(100).optional().nullable(),
  body_part_affected: z.string().max(100).optional().nullable(),
  affected_person_name: z.string().max(200).optional().nullable(),
  affected_person_role: z.string().max(100).optional().nullable(),
  days_away_from_work: z.number().int().min(0).optional().nullable(),
  days_job_transfer: z.number().int().min(0).optional().nullable(),
  description: z.string().min(1, 'Description is required').max(5000),
  immediate_cause: z.string().max(2000).optional().nullable(),
  root_cause: z.string().max(2000).optional().nullable(),
  corrective_actions: z.string().max(2000).optional().nullable(),
  witnesses: z.array(z.string().max(200)).optional().nullable(),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).default('open'),
})

const GetIncidentsQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  severity: z.enum(['near_miss', 'first_aid', 'medical_treatment', 'recordable', 'lost_time', 'fatality']).optional(),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  is_osha_recordable: z.enum(['true', 'false']).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
})

// ============================================================================
// GET /api/compliance/incidents
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
    const queryResult = GetIncidentsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))

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
      .from('safety_incidents')
      .select(`
        id, incident_number, occurred_at, location, severity,
        is_osha_recordable, is_dart_case, injury_type, body_part_affected,
        affected_person_name, affected_person_role, days_away_from_work,
        days_job_transfer, description, immediate_cause, root_cause,
        corrective_actions, witnesses, status, created_at, updated_at,
        project:project_id (id, name),
        reported_by:reported_by_id (id, full_name)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.project_id) query = query.eq('project_id', params.project_id)
    if (params.severity) query = query.eq('severity', params.severity)
    if (params.status) query = query.eq('status', params.status)
    if (params.is_osha_recordable) query = query.eq('is_osha_recordable', params.is_osha_recordable === 'true')
    if (params.year) {
      query = query
        .gte('occurred_at', `${params.year}-01-01T00:00:00Z`)
        .lte('occurred_at', `${params.year}-12-31T23:59:59Z`)
    }

    const { data: incidents, error, count } = await query

    if (error) {
      console.error('[GET /api/compliance/incidents]', error)
      return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
    }

    // 5. SUMMARY STATS (for current year)
    const currentYear = new Date().getFullYear()
    const { data: yearIncidents } = await supabase
      .from('safety_incidents')
      .select('severity, is_osha_recordable, is_dart_case, days_away_from_work, days_job_transfer')
      .eq('company_id', profile.company_id)
      .gte('occurred_at', `${currentYear}-01-01T00:00:00Z`)
      .lte('occurred_at', `${currentYear}-12-31T23:59:59Z`)

    const totalRecordable = yearIncidents?.filter(i => i.is_osha_recordable).length || 0
    const totalDart = yearIncidents?.filter(i => i.is_dart_case).length || 0

    return NextResponse.json({
      data: incidents || [],
      count: count || 0,
      pagination: { limit, offset },
      summary: {
        year: currentYear,
        totalRecordable,
        totalDart,
        totalYtd: yearIncidents?.length || 0,
      }
    })

  } catch (error) {
    console.error('[GET /api/compliance/incidents] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST /api/compliance/incidents
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

    const validation = CreateIncidentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // 4. INSERT INCIDENT
    const { data: incident, error } = await supabase
      .from('safety_incidents')
      .insert({
        company_id: profile.company_id,
        reported_by_id: user.id,
        ...data,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/compliance/incidents]', error)
      return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
    }

    // 5. If OSHA recordable, create OSHA 300 log entry automatically
    if (data.is_osha_recordable && incident) {
      const classify = data.severity === 'fatality' ? 'death'
        : data.severity === 'lost_time' ? 'days_away'
        : data.is_dart_case ? 'restricted'
        : 'other'

      await supabase
        .from('osha_300_log')
        .insert({
          company_id: profile.company_id,
          incident_id: incident.id,
          employee_name: data.affected_person_name || 'Unknown',
          job_title: data.affected_person_role || 'Unknown',
          date_of_injury: data.occurred_at,
          where_event_occurred: data.location,
          describe_injury: data.description,
          classify_case: classify,
          days_away_from_work: data.days_away_from_work || 0,
          days_restricted: data.days_job_transfer || 0,
          injury_type: data.injury_type || 'Other',
          year: new Date(data.occurred_at).getFullYear(),
        })
    }

    return NextResponse.json(
      { data: incident, message: 'Incident reported successfully' },
      { status: 201 }
    )

  } catch (error) {
    console.error('[POST /api/compliance/incidents] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
