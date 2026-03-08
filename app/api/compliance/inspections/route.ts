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
// ============================================================================

const CreateInspectionSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  inspection_type: z.enum([
    'daily_safety', 'weekly_safety', 'fire_safety', 'electrical',
    'scaffold', 'fall_protection', 'equipment', 'environmental',
    'quality_control', 'pre_task', 'other'
  ]),
  inspector_name: z.string().min(1, 'Inspector name is required').max(200),
  inspector_id: z.string().uuid().optional().nullable(),
  scheduled_date: z.string().datetime({ offset: true }),
  status: z.enum(['scheduled', 'in_progress', 'passed', 'failed', 'requires_action']).default('scheduled'),
  items_checked: z.number().int().min(0).optional().nullable(),
  items_passed: z.number().int().min(0).optional().nullable(),
  items_failed: z.number().int().min(0).optional().nullable(),
  findings: z.string().max(5000).optional().nullable(),
  corrective_actions_required: z.string().max(5000).optional().nullable(),
  follow_up_date: z.string().datetime({ offset: true }).optional().nullable(),
})

const GetInspectionsQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'in_progress', 'passed', 'failed', 'requires_action']).optional(),
  inspection_type: z.enum([
    'daily_safety', 'weekly_safety', 'fire_safety', 'electrical',
    'scaffold', 'fall_protection', 'equipment', 'environmental',
    'quality_control', 'pre_task', 'other'
  ]).optional(),
  upcoming_days: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
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

    // 4. BUILD QUERY
    let query = supabase
      .from('inspections')
      .select(`
        id, inspection_type, inspector_name, scheduled_date, completed_date,
        status, overall_result, items_checked, items_passed, items_failed,
        findings, corrective_actions_required, follow_up_date, created_at, updated_at,
        project:project_id (id, name),
        inspector:inspector_id (id, full_name)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('scheduled_date', { ascending: true })
      .range(offset, offset + limit - 1)

    if (params.project_id) query = query.eq('project_id', params.project_id)
    if (params.status) query = query.eq('status', params.status)
    if (params.inspection_type) query = query.eq('inspection_type', params.inspection_type)

    if (params.upcoming_days) {
      const days = parseInt(params.upcoming_days)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      query = query
        .gte('scheduled_date', new Date().toISOString())
        .lte('scheduled_date', futureDate.toISOString())
        .eq('status', 'scheduled')
    }

    const { data: inspections, error, count } = await query

    if (error) {
      console.error('[GET /api/compliance/inspections]', error)
      return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 })
    }

    // 5. SUMMARY STATS
    const allInspections = inspections || []
    const passedCount = allInspections.filter(i => i.status === 'passed').length
    const failedCount = allInspections.filter(i => i.status === 'failed' || i.status === 'requires_action').length
    const scheduledCount = allInspections.filter(i => i.status === 'scheduled').length
    const passRate = passedCount + failedCount > 0
      ? Math.round((passedCount / (passedCount + failedCount)) * 100)
      : 0

    return NextResponse.json({
      data: inspections || [],
      count: count || 0,
      pagination: { limit, offset },
      summary: {
        scheduled: scheduledCount,
        passed: passedCount,
        failed: failedCount,
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

    // 4. COMPUTE OVERALL RESULT IF ITEMS ARE PROVIDED
    let overall_result: string | null = null
    if (data.items_checked && data.items_checked > 0) {
      const passRate = data.items_passed ? (data.items_passed / data.items_checked) * 100 : 0
      overall_result = passRate === 100 ? 'excellent'
        : passRate >= 90 ? 'good'
        : passRate >= 75 ? 'satisfactory'
        : passRate >= 50 ? 'needs_improvement'
        : 'unsatisfactory'
    }

    // 5. INSERT INSPECTION
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        company_id: profile.company_id,
        ...data,
        overall_result,
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
