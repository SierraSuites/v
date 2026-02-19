// ============================================================
// API ROUTE: /api/compliance/certifications
// Handles GET (list certs) and POST (create cert)
// SECURITY: Auth required, company-isolated via RLS
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// DB columns: certification_type (enum), name, description, issuing_authority,
//   certification_number, holder_type (enum), holder_id, holder_name,
//   issue_date (DATE), expiration_date (DATE), renewal_required, is_active,
//   cost, renewal_cost, alert_days_before, required_for_projects,
//   compliance_notes, created_by
// ============================================================================

const CreateCertificationSchema = z.object({
  certification_type: z.enum([
    'company_license', 'insurance', 'bond', 'osha_training',
    'equipment_cert', 'trade_license', 'professional_cert', 'other'
  ]),
  name:                   z.string().min(1, 'Certification name is required').max(255),
  description:            z.string().max(2000).optional().nullable(),
  issuing_authority:      z.string().max(255).optional().nullable(),
  certification_number:   z.string().max(100).optional().nullable(),
  holder_type:            z.enum(['company', 'employee', 'equipment', 'subcontractor']),
  holder_id:              z.string().uuid().optional().nullable(),
  holder_name:            z.string().max(255).optional().nullable(),
  issue_date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expiration_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  renewal_required:       z.boolean().default(true),
  alert_days_before:      z.number().int().min(0).max(365).default(60),
  required_for_projects:  z.boolean().default(false),
  compliance_notes:       z.string().max(2000).optional().nullable(),
})

const GetCertificationsQuerySchema = z.object({
  certification_type: z.enum([
    'company_license', 'insurance', 'bond', 'osha_training',
    'equipment_cert', 'trade_license', 'professional_cert', 'other'
  ]).optional(),
  holder_type:         z.enum(['company', 'employee', 'equipment', 'subcontractor']).optional(),
  is_active:           z.enum(['true', 'false']).optional(),
  expiring_within_days: z.string().regex(/^\d+$/).optional(),
  holder_name:         z.string().max(255).optional(),
  limit:               z.string().regex(/^\d+$/).optional(),
  offset:              z.string().regex(/^\d+$/).optional(),
})

// ============================================================================
// GET /api/compliance/certifications
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
    const queryResult = GetCertificationsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))

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
      .from('certifications')
      .select(`
        id, certification_type, name, description, issuing_authority,
        certification_number, holder_type, holder_id, holder_name,
        issue_date, expiration_date, renewal_required, is_active,
        alert_days_before, required_for_projects, compliance_notes,
        created_at, updated_at, created_by
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('expiration_date', { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (params.certification_type) query = query.eq('certification_type', params.certification_type)
    if (params.holder_type) query = query.eq('holder_type', params.holder_type)
    if (params.is_active) query = query.eq('is_active', params.is_active === 'true')
    if (params.holder_name) query = query.ilike('holder_name', `%${params.holder_name}%`)

    if (params.expiring_within_days) {
      const days = parseInt(params.expiring_within_days)
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      const futureDateStr = futureDate.toISOString().split('T')[0]
      query = query
        .gte('expiration_date', today)
        .lte('expiration_date', futureDateStr)
        .eq('is_active', true)
    }

    const { data: certifications, error, count } = await query

    if (error) {
      console.error('[GET /api/compliance/certifications]', error)
      return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
    }

    // 5. EXPIRY SUMMARY — computed from expiration_date and is_active
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in30 = new Date(today); in30.setDate(today.getDate() + 30)
    const in60 = new Date(today); in60.setDate(today.getDate() + 60)
    const in90 = new Date(today); in90.setDate(today.getDate() + 90)

    const allCerts = certifications || []
    const expiredCount  = allCerts.filter(c => c.expiration_date && c.expiration_date < todayStr).length
    const expiring30    = allCerts.filter(c => c.expiration_date && c.expiration_date >= todayStr && new Date(c.expiration_date) <= in30).length
    const expiring60    = allCerts.filter(c => c.expiration_date && new Date(c.expiration_date) > in30 && new Date(c.expiration_date) <= in60).length
    const expiring90    = allCerts.filter(c => c.expiration_date && new Date(c.expiration_date) > in60 && new Date(c.expiration_date) <= in90).length

    return NextResponse.json({
      data: certifications || [],
      count: count || 0,
      pagination: { limit, offset },
      summary: {
        expired:          expiredCount,
        expiringIn30Days: expiring30,
        expiringIn60Days: expiring60,
        expiringIn90Days: expiring90,
        totalActive:      allCerts.filter(c => c.is_active).length,
      }
    })

  } catch (error) {
    console.error('[GET /api/compliance/certifications] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST /api/compliance/certifications
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

    const validation = CreateCertificationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // 4. SET is_active BASED ON EXPIRATION DATE
    // If expiration_date is in the past, mark inactive (expired)
    const isActive = data.expiration_date
      ? data.expiration_date >= new Date().toISOString().split('T')[0]
      : true

    // 5. INSERT CERTIFICATION — column names match DB schema exactly
    const { data: certification, error } = await supabase
      .from('certifications')
      .insert({
        company_id: profile.company_id,
        created_by: user.id,
        is_active:  isActive,
        ...data,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/compliance/certifications]', error)
      return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 })
    }

    return NextResponse.json(
      { data: certification, message: 'Certification added successfully' },
      { status: 201 }
    )

  } catch (error) {
    console.error('[POST /api/compliance/certifications] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
