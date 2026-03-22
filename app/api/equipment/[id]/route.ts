import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET - Get single equipment item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(
        `
        *,
        current_project:projects(id, name, address),
        assigned_user:profiles!equipment_assigned_to_fkey(id, full_name, email),
        maintenance_records:equipment_maintenance(
          *,
          performed_by_user:profiles!equipment_maintenance_performed_by_fkey(full_name)
        ),
        assignment_history:equipment_assignments(
          *,
          assigned_user:profiles!equipment_assignments_assigned_to_fkey(full_name),
          project:projects(name)
        ),
        inspections:equipment_inspections(
          *,
          inspector:profiles!equipment_inspections_inspector_id_fkey(full_name)
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching equipment:', error)
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // Sort related records by date
    if (equipment.maintenance_records) {
      equipment.maintenance_records.sort(
        (a: any, b: any) => new Date(b.maintenance_date).getTime() - new Date(a.maintenance_date).getTime()
      )
    }

    if (equipment.assignment_history) {
      equipment.assignment_history.sort(
        (a: any, b: any) => new Date(b.checked_out_at).getTime() - new Date(a.checked_out_at).getTime()
      )
    }

    if (equipment.inspections) {
      equipment.inspections.sort(
        (a: any, b: any) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime()
      )
    }

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error('Error in equipment GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update equipment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data: equipment, error } = await supabase
      .from('equipment')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating equipment:', error)
      return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
    }

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error('Error in equipment PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Delete equipment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase.from('equipment').delete().eq('id', id)

    if (error) {
      console.error('Error deleting equipment:', error)
      return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Equipment deleted successfully' })
  } catch (error) {
    console.error('Error in equipment DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
