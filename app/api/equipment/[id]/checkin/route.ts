import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST - Checkin equipment
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

    const body = await request.json()
    const { condition_at_checkin, hours_used, fuel_used_gallons, damage_reported } = body

    // Find active assignment
    const { data: assignment } = await supabase
      .from('equipment_assignments')
      .select('*, equipment:equipment(name)')
      .eq('equipment_id', id)
      .is('checked_in_at', null)
      .order('checked_out_at', { ascending: false })
      .limit(1)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'No active assignment found for this equipment' }, { status: 404 })
    }

    // Update assignment record
    const { error } = await supabase
      .from('equipment_assignments')
      .update({
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
        condition_at_checkin,
        hours_used,
        fuel_used_gallons,
        damage_reported,
      })
      .eq('id', assignment.id)

    if (error) {
      console.error('Error updating assignment:', error)
      return NextResponse.json({ error: 'Failed to checkin equipment' }, { status: 500 })
    }

    return NextResponse.json({
      message: `${assignment.equipment.name} checked in successfully`,
    })
  } catch (error) {
    console.error('Error in equipment checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
