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
// ============================================================================

const CreateCertificationSchema = z.object({
  user_id: z.string().uuid().optional().nullable(),
  holder_name: z.string().min(1, 'Holder name is required').max(200),
  holder_role: z.string().max(100).optional().nullable(),
  certification_type: z.enum([
    'osha_10', 'osha_30', 'first_aid_cpr', 'equipment_operator',
    'fall_protection', 'hazmat', 'electrical', 'forklift',
    'scaffold', 'confined_space', 'other'
  ]),
  certification_name: z.string().min(1, 'Certification name is required').max(300),
  issuing_authority: z.string().max(300).optional().nullable(),
  issue_date: z.string().datetime({ offset: true }).optional().nullable(),
  expiry_date: z.string().datetime({ offset: true }).optional().nullable(),
  certification_number: z.string().max(100).optional().nullable(),
  status: z.enum(['active', 'expired', 'suspended', 'pending_renewal']).default('active'),
  reminder_days_before: z.number().int().min(0).max(365).default(30),
  notes: z.string().max(2000).optional().nullable(),
})

const GetCertificationsQuerySchema = z.object({
  status: z.enum(['active', 'expired', 'suspended', 'pending_renewal']).optional(),
  certification_type: z.enum([
    'osha_10', 'osha_30', 'first_aid_cpr', 'equipment_operator',
    'fall_protection', 'hazmat', 'electrical', 'forklift',
    'scaffold', 'confined_space', 'other'
  ]).optional(),
  expiring_within_days: z.string().regex(/^\d+$/).optional(),
  holder_name: z.string().max(200).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
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

    // 4. BUILD QUERY
    let query = supabase
      .from('certifications')
      .select(`
        id, holder_name, holder_role, certification_type, certification_name,
        issuing_authority, issue_date, expiry_date, certification_number,
        status, reminder_days_before, notes, created_at, updated_at,
        holder:user_id (id, full_name, email)
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (params.status) query = query.eq('status', params.status)
    if (params.certification_type) query = query.eq('certification_type', params.certification_type)

    if (params.holder_name) {
      query = query.ilike('holder_name', `%${params.holder_name}%`)
    }

    if (params.expiring_within_days) {
      const days = parseInt(params.expiring_within_days)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      query = query
        .lte('expiry_date', futureDate.toISOString())
        .gte('expiry_date', new Date().toISOString())
    }

    const { data: certifications, error, count } = await query

    if (error) {
      console.error('[GET /api/compliance/certifications]', error)
      return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
    }

    // 5. EXPIRY SUMMARY
    const now = new Date()
    const in30Days = new Date(); in30Days.setDate(now.getDate() + 30)
    const in60Days = new Date(); in60Days.setDate(now.getDate() + 60)
    const in90Days = new Date(); in90Days.setDate(now.getDate() + 90)

    const allCerts = certifications || []
    const expiredCount = allCerts.filter(c => c.expiry_date && new Date(c.expiry_date) < now).length
    const expiring30 = allCerts.filter(c => c.expiry_date && new Date(c.expiry_date) >= now && new Date(c.expiry_date) <= in30Days).length
    const expiring60 = allCerts.filter(c => c.expiry_date && new Date(c.expiry_date) > in30Days && new Date(c.expiry_date) <= in60Days).length
    const expiring90 = allCerts.filter(c => c.expiry_date && new Date(c.expiry_date) > in60Days && new Date(c.expiry_date) <= in90Days).length

    return NextResponse.json({
      data: certifications || [],
      count: count || 0,
      pagination: { limit, offset },
      summary: {
        expired: expiredCount,
        expiringIn30Days: expiring30,
        expiringIn60Days: expiring60,
        expiringIn90Days: expiring90,
        totalActive: allCerts.filter(c => c.status === 'active').length,
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

    // 4. AUTO-SET STATUS IF EXPIRED
    let status = data.status
    if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
      status = 'expired'
    }

    // 5. INSERT CERTIFICATION
    const { data: certification, error } = await supabase
      .from('certifications')
      .insert({
        company_id: profile.company_id,
        ...data,
        status,
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
