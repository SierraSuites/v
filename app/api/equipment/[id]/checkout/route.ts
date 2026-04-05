import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST - Checkout equipment
 */
export async function POST(
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

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    const body = await request.json()
    const { assigned_to, project_id, expected_return_date, condition_at_checkout, location_notes } = body

    // Check if equipment is available
    const { data: equipment } = await supabase
      .from('equipment')
      .select('status, name')
      .eq('id', id)
      .single()

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    if (equipment.status !== 'available') {
      return NextResponse.json(
        { error: `Equipment is not available (current status: ${equipment.status})` },
        { status: 400 }
      )
    }

    // Create assignment record
    const { data: assignment, error } = await supabase
      .from('equipment_assignments')
      .insert({
        equipment_id: id,
        company_id: profile.company_id,
        assigned_to,
        project_id,
        expected_return_date,
        condition_at_checkout,
        location_notes,
        checked_out_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating assignment:', error)
      return NextResponse.json({ error: 'Failed to checkout equipment' }, { status: 500 })
    }

    return NextResponse.json({ assignment, message: `${equipment.name} checked out successfully` })
  } catch (error) {
    console.error('Error in equipment checkout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
