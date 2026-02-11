export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api-permissions'
import crypto from 'crypto'

// PUT /api/teams/members
// Update a team member
export async function PUT(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canChangeRoles')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { memberId, updates } = await req.json()

    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      console.error('Error updating team member:', error)
      return NextResponse.json(
        { error: 'Failed to update team member' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in teams/members PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/teams/members
// Create a team invitation
export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canInviteMembers')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { teamId, email, role } = await req.json()

    // Generate a crypto token
    const token = crypto.randomBytes(32).toString('hex')

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        role,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating team invitation:', error)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in teams/members POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
