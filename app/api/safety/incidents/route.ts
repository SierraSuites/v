// API Route: Safety Incidents
// GET /api/safety/incidents - List incidents
// POST /api/safety/incidents - Create incident

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createIncidentSchema = z.object({
  projectId: z.string().uuid().optional(),
  incidentDate: z.string(), // ISO date
  incidentTime: z.string(), // HH:MM format
  locationDescription: z.string().min(1),
  incidentType: z.enum(['injury', 'near_miss', 'property_damage', 'environmental', 'vehicle']),
  severity: z.enum(['minor', 'moderate', 'serious', 'critical', 'fatal']),
  description: z.string().min(10),

  // Optional fields
  injuredPersonName: z.string().optional(),
  injuredPersonRole: z.string().optional(),
  injuredPersonCompany: z.string().optional(),
  immediateCause: z.string().optional(),
  rootCause: z.string().optional(),
  contributingFactors: z.array(z.string()).optional(),
  injuryType: z.string().optional(),
  bodyPartAffected: z.string().optional(),
  treatmentProvided: z.string().optional(),
  medicalFacility: z.string().optional(),
  daysAwayFromWork: z.number().int().min(0).optional(),
  daysOfRestrictedWork: z.number().int().min(0).optional(),
  isOshaRecordable: z.boolean().optional(),
  oshaClassification: z.string().optional(),
  witnesses: z.array(z.object({
    name: z.string(),
    contact: z.string(),
    statement: z.string()
  })).optional(),
  photos: z.array(z.string()).optional(),
  documents: z.array(z.string()).optional(),
  immediateActionsTaken: z.string().optional(),
  preventiveMeasures: z.array(z.string()).optional(),
  responsiblePerson: z.string().uuid().optional(),
  correctiveActionDueDate: z.string().optional(),
})

// ============================================
// GET /api/safety/incidents
// List safety incidents with filters
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const incidentType = searchParams.get('type')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('safety_incidents')
      .select(`
        *,
        project:project_id (id, name),
        reported_by_user:reported_by (
          id,
          profiles (full_name, avatar_url)
        ),
        responsible_user:responsible_person (
          id,
          profiles (full_name)
        ),
        investigator:investigated_by (
          id,
          profiles (full_name)
        )
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .order('incident_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (projectId) query = query.eq('project_id', projectId)
    if (incidentType) query = query.eq('incident_type', incidentType)
    if (severity) query = query.eq('severity', severity)
    if (status) query = query.eq('status', status)
    if (startDate) query = query.gte('incident_date', startDate)
    if (endDate) query = query.lte('incident_date', endDate)

    const { data: incidents, error, count } = await query

    if (error) {
      console.error('Error fetching incidents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch incidents' },
        { status: 500 }
      )
    }

    // Get statistics
    const { data: stats } = await supabase
      .rpc('get_safety_statistics', { p_company_id: profile.company_id })

    return NextResponse.json({
      incidents,
      total: count,
      stats,
    })
  } catch (error) {
    console.error('Error in GET /api/safety/incidents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/safety/incidents
// Create a new safety incident
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createIncidentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Create incident
    const { data: incident, error: incidentError } = await supabase
      .from('safety_incidents')
      .insert({
        company_id: profile.company_id,
        project_id: data.projectId || null,
        incident_date: data.incidentDate,
        incident_time: data.incidentTime,
        location_description: data.locationDescription,
        incident_type: data.incidentType,
        severity: data.severity,
        description: data.description,
        reported_by: user.id,
        injured_person_name: data.injuredPersonName || null,
        injured_person_role: data.injuredPersonRole || null,
        injured_person_company: data.injuredPersonCompany || null,
        immediate_cause: data.immediateCause || null,
        root_cause: data.rootCause || null,
        contributing_factors: data.contributingFactors || null,
        injury_type: data.injuryType || null,
        body_part_affected: data.bodyPartAffected || null,
        treatment_provided: data.treatmentProvided || null,
        medical_facility: data.medicalFacility || null,
        days_away_from_work: data.daysAwayFromWork || 0,
        days_of_restricted_work: data.daysOfRestrictedWork || 0,
        is_osha_recordable: data.isOshaRecordable || false,
        osha_classification: data.oshaClassification || null,
        witnesses: data.witnesses || null,
        photos: data.photos || null,
        documents: data.documents || null,
        immediate_actions_taken: data.immediateActionsTaken || null,
        preventive_measures: data.preventiveMeasures || null,
        responsible_person: data.responsiblePerson || null,
        corrective_action_due_date: data.correctiveActionDueDate || null,
        status: 'open',
      })
      .select()
      .single()

    if (incidentError) {
      console.error('Error creating incident:', incidentError)
      return NextResponse.json(
        { error: 'Failed to create incident' },
        { status: 500 }
      )
    }

    // Create notification for responsible person
    if (data.responsiblePerson) {
      await supabase.rpc('create_notification', {
        p_user_id: data.responsiblePerson,
        p_company_id: profile.company_id,
        p_notification_type: 'safety_incident',
        p_title: 'New Safety Incident Assigned',
        p_content: `A ${data.severity} ${data.incidentType} incident has been assigned to you`,
        p_entity_type: 'safety_incident',
        p_entity_id: incident.id,
        p_action_url: `/compliance/incidents/${incident.id}`,
        p_priority: data.severity === 'critical' || data.severity === 'fatal' ? 'urgent' : 'high'
      })
    }

    return NextResponse.json(
      { message: 'Incident created successfully', incident },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/safety/incidents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
