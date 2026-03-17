import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET - List all equipment
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')
    const assignedTo = searchParams.get('assigned_to')

    // Build query
    let query = supabase
      .from('equipment')
      .select(
        `
        *,
        current_project:projects(id, name),
        assigned_user:profiles!equipment_assigned_to_fkey(id, full_name)
      `
      )
      .eq('company_id', profile.company_id)
      .order('name')

    if (category) {
      query = query.eq('category', category)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (projectId) {
      query = query.eq('current_project_id', projectId)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    const { data: equipment, error } = await query

    if (error) {
      console.error('Error fetching equipment:', error)
      return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
    }

    // Calculate summary stats
    const summary = {
      total: equipment?.length || 0,
      available: equipment?.filter((e) => e.status === 'available').length || 0,
      in_use: equipment?.filter((e) => e.status === 'in_use').length || 0,
      maintenance: equipment?.filter((e) => e.status === 'maintenance').length || 0,
      needs_maintenance: equipment?.filter((e) => {
        if (!e.next_maintenance_date) return false
        return new Date(e.next_maintenance_date) < new Date()
      }).length || 0,
    }

    return NextResponse.json({ equipment, summary })
  } catch (error) {
    console.error('Error in equipment GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Create new equipment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    const body = await request.json()

    // Generate QR code ID
    const qrCode = `EQ-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const { data: equipment, error } = await supabase
      .from('equipment')
      .insert({
        company_id: profile.company_id,
        created_by: user.id,
        qr_code: qrCode,
        ...body,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating equipment:', error)
      return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
    }

    return NextResponse.json({ equipment }, { status: 201 })
  } catch (error) {
    console.error('Error in equipment POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
