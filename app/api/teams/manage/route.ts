export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/teams/manage
// Create a new team
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, description, team_type, color } = await req.json()

    // Get user's company_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'User profile not found or not associated with a company' },
        { status: 404 }
      )
    }

    // Insert into company_teams
    const { data: team, error: teamError } = await supabase
      .from('company_teams')
      .insert({
        company_id: profile.company_id,
        name,
        description,
        team_type,
        color,
        created_by: user.id,
      })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      )
    }

    // Insert creator as admin/lead team member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'admin',
        is_lead: true,
      })

    if (memberError) {
      console.error('Error adding creator as team member:', memberError)
      // Team was created but member insert failed - still return the team
    }

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error in teams/manage POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
