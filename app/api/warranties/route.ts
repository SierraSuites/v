// API Route: Warranties
// GET /api/warranties - List warranties
// POST /api/warranties - Create warranty

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createWarrantySchema = z.object({
  warrantyName: z.string().min(1).max(255),
  warrantyType: z.enum(['manufacturer', 'contractor', 'extended', 'service_agreement']),
  description: z.string().optional(),
  itemDescription: z.string().min(1),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  installationDate: z.string().optional(), // ISO date
  installationLocation: z.string().optional(),
  coverageType: z.enum(['parts_only', 'labor_only', 'parts_and_labor', 'full']),
  coverageDescription: z.string().optional(),
  warrantyTerms: z.string().optional(),
  startDate: z.string(), // ISO date
  endDate: z.string(), // ISO date
  isTransferable: z.boolean().default(false),
  vendorName: z.string().min(1),
  vendorContactName: z.string().optional(),
  vendorEmail: z.string().email().optional(),
  vendorPhone: z.string().optional(),
  warrantyCertificateUrl: z.string().optional(),
  documentUrls: z.array(z.string()).optional(),
  purchasePrice: z.number().optional(),
  warrantyCost: z.number().optional(),
  responsiblePerson: z.string().uuid().optional(),
  notes: z.string().optional(),
  projectId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
})

// ============================================
// GET /api/warranties
// List warranties with filters
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
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const warrantyType = searchParams.get('type')
    const expiringWithin = searchParams.get('expiringWithin') // days
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('warranties')
      .select(`
        *,
        project:project_id (id, name),
        vendor:vendor_id (id, company_name),
        responsible:responsible_person (
          id,
          profiles (full_name)
        ),
        creator:created_by (
          id,
          profiles (full_name)
        )
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .order('end_date', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (projectId) query = query.eq('project_id', projectId)
    if (status) query = query.eq('status', status)
    if (warrantyType) query = query.eq('warranty_type', warrantyType)

    if (expiringWithin) {
      const days = parseInt(expiringWithin)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      query = query
        .lte('end_date', futureDate.toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0])
        .eq('status', 'active')
    }

    const { data: warranties, error, count } = await query

    if (error) {
      console.error('Error fetching warranties:', error)
      return NextResponse.json(
        { error: 'Failed to fetch warranties' },
        { status: 500 }
      )
    }

    // Get statistics
    const { data: stats } = await supabase
      .from('warranties')
      .select('status')
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)

    const statusCounts = stats?.reduce((acc: any, w: any) => {
      acc[w.status] = (acc[w.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      warranties,
      total: count,
      stats: statusCounts,
    })
  } catch (error) {
    console.error('Error in GET /api/warranties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/warranties
// Create a new warranty
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
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createWarrantySchema.safeParse(body)

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

    // Calculate duration in months
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    const durationMonths = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )

    // Create warranty
    const { data: warranty, error: warrantyError } = await supabase
      .from('warranties')
      .insert({
        company_id: profile.company_id,
        project_id: data.projectId || null,
        warranty_name: data.warrantyName,
        warranty_type: data.warrantyType,
        description: data.description || null,
        item_description: data.itemDescription,
        manufacturer: data.manufacturer || null,
        model_number: data.modelNumber || null,
        serial_number: data.serialNumber || null,
        installation_date: data.installationDate || null,
        installation_location: data.installationLocation || null,
        coverage_type: data.coverageType,
        coverage_description: data.coverageDescription || null,
        warranty_terms: data.warrantyTerms || null,
        start_date: data.startDate,
        end_date: data.endDate,
        duration_months: durationMonths,
        is_transferable: data.isTransferable,
        vendor_id: data.vendorId || null,
        vendor_name: data.vendorName,
        vendor_contact_name: data.vendorContactName || null,
        vendor_email: data.vendorEmail || null,
        vendor_phone: data.vendorPhone || null,
        warranty_certificate_url: data.warrantyCertificateUrl || null,
        document_urls: data.documentUrls || null,
        purchase_price: data.purchasePrice || null,
        warranty_cost: data.warrantyCost || null,
        responsible_person: data.responsiblePerson || user.id,
        notes: data.notes || null,
        created_by: user.id,
        status: 'active',
      })
      .select()
      .single()

    if (warrantyError) {
      console.error('Error creating warranty:', warrantyError)
      return NextResponse.json(
        { error: 'Failed to create warranty' },
        { status: 500 }
      )
    }

    // Create notification for responsible person
    if (data.responsiblePerson && data.responsiblePerson !== user.id) {
      await supabase.rpc('create_notification', {
        p_user_id: data.responsiblePerson,
        p_company_id: profile.company_id,
        p_notification_type: 'warranty_assigned',
        p_title: 'New Warranty Assigned',
        p_content: `You are now responsible for tracking warranty: ${data.warrantyName}`,
        p_entity_type: 'warranty',
        p_entity_id: warranty.id,
        p_action_url: `/warranties/${warranty.id}`,
        p_priority: 'normal'
      })
    }

    return NextResponse.json(
      { message: 'Warranty created successfully', warranty },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/warranties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
