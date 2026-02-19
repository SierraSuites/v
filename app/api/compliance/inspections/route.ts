// ============================================================
// API ROUTE: /api/compliance/inspections
// Handles GET (list inspections) and POST (create inspection)
// SECURITY: Auth required, company-isolated via RLS
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// DB columns: inspection_type (enum), inspection_name, description,
//   scheduled_date (DATE), scheduled_time (TIME), requested_by (FK auth.users),
//   inspector_name VARCHAR, inspector_agency VARCHAR, inspector_contact VARCHAR,
//   inspector_email VARCHAR, inspector_phone VARCHAR,
//   status (enum), inspection_date (DATE), result (enum),
//   inspector_notes, conditions_of_approval, deficiencies JSONB,
//   reinspection_required, reinspection_deadline (DATE), notify_before_days
// ============================================================================

const CreateInspectionSchema = z.object({
  project_id:          z.string().uuid('Invalid project ID'),
  inspection_type:     z.enum([
    'building_code', 'electrical', 'plumbing', 'mechanical',
    'structural', 'fire_safety', 'osha', 'final', 'other'
  ]),
  inspection_name:     z.string().min(1, 'Inspection name is required').max(255),
  description:         z.string().max(2000).optional().nullable(),
  scheduled_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  scheduled_time:      z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  // External inspector info (not a user FK)
  inspector_name:      z.string().max(255).optional().nullable(),
  inspector_agency:    z.string().max(255).optional().nullable(),
  inspector_contact:   z.string().max(255).optional().nullable(),
  inspector_email:     z.string().email().max(255).optional().nullable(),
  inspector_phone:     z.string().max(50).optional().nullable(),
  status:              z.enum([
    'scheduled', 'in_progress', 'passed',
    'passed_with_conditions', 'failed', 'cancelled', 'rescheduled'
  ]).default('scheduled'),
  notify_before_days:  z.number().int().min(0).max(30).default(3),
})

const GetInspectionsQuerySchema = z.object({
  project_id:      z.string().uuid().optional(),
  status:          z.enum([
    'scheduled', 'in_progress', 'passed',
    'passed_with_conditions', 'failed', 'cancelled', 'rescheduled'
  ]).optional(),
  inspection_type: z.enum([
    'building_code', 'electrical', 'plumbing', 'mechanical',
    'structural', 'fire_safety', 'osha', 'final', 'other'
  ]).optional(),
  upcoming_days:   z.string().regex(/^\d+$/).optional(),
  limit:           z.string().regex(/^\d+$/).optional(),
  offset:          z.string().regex(/^\d+$/).optional(),
})

// ============================================================================
// GET /api/compliance/inspections
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
    const queryResult = GetInspectionsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))

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
      .from('inspections')
      .select(`
        id, inspection_type, inspection_name, description,
        scheduled_date, scheduled_time, requested_by,
        inspector_name, inspector_agency, inspector_phone,
        status, inspection_date, result,
        inspector_notes, conditions_of_approval,
        reinspection_required, reinspection_deadline,
        notify_before_days, created_at, updated_at,
        project:project_id (id, name)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('scheduled_date', { ascending: true })
      .range(offset, offset + limit - 1)

    if (params.project_id) query = query.eq('project_id', params.project_id)
    if (params.status) query = query.eq('status', params.status)
    if (params.inspection_type) query = query.eq('inspection_type', params.inspection_type)

    if (params.upcoming_days) {
      const days = parseInt(params.upcoming_days)
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      const futureDateStr = futureDate.toISOString().split('T')[0]
      query = query
        .gte('scheduled_date', today)
        .lte('scheduled_date', futureDateStr)
        .eq('status', 'scheduled')
    }

    const { data: inspections, error, count } = await query

    if (error) {
      console.error('[GET /api/compliance/inspections]', error)
      return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 })
    }

    // 5. SUMMARY STATS
    const allInspections = inspections || []
    const passedCount    = allInspections.filter(i => i.status === 'passed' || i.status === 'passed_with_conditions').length
    const failedCount    = allInspections.filter(i => i.status === 'failed').length
    const scheduledCount = allInspections.filter(i => i.status === 'scheduled').length
    const passRate       = passedCount + failedCount > 0
      ? Math.round((passedCount / (passedCount + failedCount)) * 100)
      : 0

    return NextResponse.json({
      data: inspections || [],
      count: count || 0,
      pagination: { limit, offset },
      summary: {
        scheduled: scheduledCount,
        passed:    passedCount,
        failed:    failedCount,
        passRate,
      }
    })

  } catch (error) {
    console.error('[GET /api/compliance/inspections] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST /api/compliance/inspections
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

    const validation = CreateInspectionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // 4. INSERT INSPECTION — column names match DB schema exactly
    // requested_by = the user scheduling the inspection (not the external inspector)
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        company_id:   profile.company_id,
        requested_by: user.id,   // DB column: requested_by (user who scheduled it)
        ...data,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/compliance/inspections]', error)
      return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 })
    }

    return NextResponse.json(
      { data: inspection, message: 'Inspection scheduled successfully' },
      { status: 201 }
    )

  } catch (error) {
    console.error('[POST /api/compliance/inspections] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
