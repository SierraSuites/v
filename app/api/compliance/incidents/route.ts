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
  project_id:                z.string().uuid().optional().nullable(),
  occurred_at:               z.string().min(1, 'Date/time is required'),
  location:                  z.string().min(1, 'Location is required').max(500),
  severity:                  z.enum(['near_miss', 'first_aid', 'medical_treatment', 'recordable', 'lost_time', 'fatality']),
  incident_type:             z.enum(['injury', 'illness', 'near_miss']),
  is_osha_recordable:        z.boolean().default(false),
  is_dart_case:              z.boolean().default(false),
  injury_type:               z.string().max(100).optional().nullable(),
  body_part_affected:        z.string().max(100).optional().nullable(),
  employee_name:             z.string().max(255).optional().nullable(),
  employee_job_title:        z.string().max(255).optional().nullable(),
  days_away_from_work:       z.number().int().min(0).optional().nullable(),
  days_job_transfer_restriction: z.number().int().min(0).optional().nullable(),
  description:               z.string().min(1, 'Description is required').max(5000),
  immediate_actions_taken:   z.string().max(2000).optional().nullable(),
  corrective_actions:        z.string().max(2000).optional().nullable(),
  witnesses:                 z.array(z.string().max(200)).optional().nullable(),
  status:                    z.enum(['open', 'investigating', 'pending_action', 'closed']).default('open'),
})

const GetIncidentsQuerySchema = z.object({
  project_id:       z.string().uuid().optional(),
  severity:         z.enum(['near_miss', 'first_aid', 'medical_treatment', 'recordable', 'lost_time', 'fatality']).optional(),
  status:           z.enum(['open', 'investigating', 'pending_action', 'closed']).optional(),
  is_osha_recordable: z.enum(['true', 'false']).optional(),
  year:             z.string().regex(/^\d{4}$/).optional(),
  limit:            z.string().regex(/^\d+$/).optional(),
  offset:           z.string().regex(/^\d+$/).optional(),
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

    // 4. BUILD QUERY — only select columns that exist in the DB schema
    let query = supabase
      .from('safety_incidents')
      .select(`
        id, incident_number, occurred_at, location, severity, incident_type,
        is_osha_recordable, is_dart_case, injury_type, body_part_affected,
        employee_name, employee_job_title,
        days_away_from_work, days_job_transfer_restriction,
        description, immediate_actions_taken, corrective_actions, witnesses,
        status, reported_by, created_at, updated_at,
        project:project_id (id, name)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.project_id) query = query.eq('project_id', params.project_id)
    if (params.severity) query = query.eq('severity', params.severity)
    if (params.status) query = query.eq('status', params.status)
    if (params.is_osha_recordable) {
      query = query.eq('is_osha_recordable', params.is_osha_recordable === 'true')
    }
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
      .select('severity, is_osha_recordable, is_dart_case, days_away_from_work')
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

    // 4. INSERT INCIDENT — column names match DB schema exactly
    const { data: incident, error } = await supabase
      .from('safety_incidents')
      .insert({
        company_id:    profile.company_id,
        reported_by:   user.id,           // DB column: reported_by (not reported_by_id)
        ...data,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/compliance/incidents]', error)
      return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
    }

    // 5. If OSHA recordable, auto-create OSHA 300 log entry
    // osha_300_log columns: case_number, year, employee_name, employee_job_title,
    // incident_date (DATE), where_event_occurred, injury_or_illness (enum),
    // description, death, days_away_from_work (bool), job_transfer_restriction (bool),
    // other_recordable_case (bool), number_of_days_away, number_of_days_job_transfer
    if (data.is_osha_recordable && incident) {
      const incidentYear = new Date(data.occurred_at).getFullYear()
      const incidentDate = data.occurred_at.split('T')[0]

      // Map incident_type to osha_300_log.injury_or_illness enum
      const injuryOrIllness = data.incident_type === 'illness' ? 'all_other_illness' : 'injury'

      await supabase
        .from('osha_300_log')
        .insert({
          company_id:               profile.company_id,
          incident_id:              incident.id,
          case_number:              incident.incident_number || `${incidentYear}-${incident.id.slice(0, 8)}`,
          year:                     incidentYear,
          employee_name:            data.employee_name || 'Unknown',
          employee_job_title:       data.employee_job_title || 'Unknown',
          incident_date:            incidentDate,
          where_event_occurred:     data.location,
          injury_or_illness:        injuryOrIllness,
          description:              data.description,
          death:                    data.severity === 'fatality',
          days_away_from_work:      (data.days_away_from_work ?? 0) > 0,
          job_transfer_restriction: (data.days_job_transfer_restriction ?? 0) > 0,
          other_recordable_case:    !['fatality', 'lost_time'].includes(data.severity),
          number_of_days_away:      data.days_away_from_work ?? 0,
          number_of_days_job_transfer: data.days_job_transfer_restriction ?? 0,
        })
      // OSHA log failure is non-fatal — incident is already saved
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
