import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ROLE_PERMISSIONS, UserRole } from '@/lib/permissions'
import { z } from 'zod'
import crypto from 'crypto'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: z.string().uuid('Role ID must be a valid UUID'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
  expiresInDays: z.number().min(1).max(30).default(7) // Default: 7 days
})

const acceptInviteSchema = z.object({
  token: z.string().min(32, 'Invalid invitation token'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

// ============================================
// POST /api/team/invite
// Send invitation to join team
// ============================================

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions
    const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
      user_uuid: user.id
    })

    const userPermissions = ROLE_PERMISSIONS[highestRole as UserRole] || ROLE_PERMISSIONS.viewer

    if (!userPermissions.canInviteMembers) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to invite team members' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = inviteSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const { email, roleId, fullName, message, expiresInDays } = validationResult.data

    // Get inviter's company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, full_name, companies:company_id(name)')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile not found or not associated with a company' },
        { status: 404 }
      )
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      // User exists - check if in same company
      if (existingUser.company_id === profile.company_id) {
        return NextResponse.json(
          { error: 'User is already a member of your company' },
          { status: 409 }
        )
      } else {
        return NextResponse.json(
          { error: 'This email is already registered with another company' },
          { status: 409 }
        )
      }
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id, status, expires_at')
      .eq('email', email.toLowerCase())
      .eq('company_id', profile.company_id)
      .in('status', ['pending', 'sent'])
      .single()

    if (existingInvite) {
      // Check if expired
      if (new Date(existingInvite.expires_at) > new Date()) {
        return NextResponse.json(
          { error: 'An active invitation already exists for this email' },
          { status: 409 }
        )
      } else {
        // Mark old invitation as expired
        await supabase
          .from('team_invitations')
          .update({ status: 'expired' })
          .eq('id', existingInvite.id)
      }
    }

    // Verify role exists
    const { data: role, error: roleError } = await supabase
      .from('custom_roles')
      .select('id, role_name, company_id, is_system_role')
      .eq('id', roleId)
      .is('deleted_at', null)
      .single()

    if (roleError || !role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Verify role belongs to company (or is system role)
    if (!role.is_system_role && role.company_id !== profile.company_id) {
      return NextResponse.json(
        { error: 'Role does not belong to your company' },
        { status: 403 }
      )
    }

    // Generate secure invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        company_id: profile.company_id,
        email: email.toLowerCase(),
        role_id: roleId,
        invited_by: user.id,
        invitation_token: invitationToken,
        full_name: fullName || null,
        custom_message: message || null,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_company_id: profile.company_id,
      p_action: 'team_member_invited',
      p_entity_type: 'team_invitation',
      p_entity_id: invitation.id,
      p_old_values: null,
      p_new_values: {
        email: email.toLowerCase(),
        roleId,
        roleName: role.role_name,
        expiresAt: expiresAt.toISOString()
      },
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      p_user_agent: req.headers.get('user-agent') || 'unknown'
    })

    // TODO: Send invitation email
    // This would integrate with your email service (SendGrid, Resend, etc.)
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${invitationToken}`

    // For now, return the invitation data
    // In production, you'd send the email and only return success message
    return NextResponse.json(
      {
        message: 'Invitation created successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          expiresAt: invitation.expires_at,
          // SECURITY NOTE: Only return this for development/testing
          // Remove invitationUrl from response in production
          invitationUrl: process.env.NODE_ENV === 'development' ? invitationUrl : undefined
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// GET /api/team/invite
// Get pending invitations for company
// ============================================

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions
    const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
      user_uuid: user.id
    })

    const userPermissions = ROLE_PERMISSIONS[highestRole as UserRole] || ROLE_PERMISSIONS.viewer

    if (!userPermissions.canManageTeam) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view invitations' },
        { status: 403 }
      )
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get filter params
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending' // pending, accepted, expired, revoked, all

    // Query invitations
    let query = supabase
      .from('team_invitations')
      .select(`
        id,
        email,
        full_name,
        status,
        created_at,
        expires_at,
        accepted_at,
        custom_roles:role_id (
          id,
          role_name,
          color,
          icon
        ),
        inviter:invited_by (
          id,
          full_name,
          email
        )
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invitations, error: invitesError } = await query

    if (invitesError) {
      console.error('Error fetching invitations:', invitesError)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    // Check for expired invitations and update them
    const now = new Date()
    const expiredInvitations = invitations?.filter(inv =>
      inv.status === 'pending' && new Date(inv.expires_at) < now
    )

    if (expiredInvitations && expiredInvitations.length > 0) {
      await supabase
        .from('team_invitations')
        .update({ status: 'expired' })
        .in('id', expiredInvitations.map(inv => inv.id))

      // Update local data
      expiredInvitations.forEach(inv => {
        inv.status = 'expired'
      })
    }

    return NextResponse.json({
      invitations: invitations || [],
      total: invitations?.length || 0
    })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/team/invite
// Revoke a pending invitation
// ============================================

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permissions
    const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
      user_uuid: user.id
    })

    const userPermissions = ROLE_PERMISSIONS[highestRole as UserRole] || ROLE_PERMISSIONS.viewer

    if (!userPermissions.canManageTeam) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to revoke invitations' },
        { status: 403 }
      )
    }

    // Get invitation ID from query params
    const searchParams = req.nextUrl.searchParams
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Missing invitation ID' },
        { status: 400 }
      )
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get invitation
    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('id, email, company_id, status')
      .eq('id', invitationId)
      .single()

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Verify same company
    if (invitation.company_id !== profile.company_id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot revoke invitations from other companies' },
        { status: 403 }
      )
    }

    // Check if already accepted or revoked
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Cannot revoke an accepted invitation' },
        { status: 400 }
      )
    }

    if (invitation.status === 'revoked') {
      return NextResponse.json(
        { error: 'Invitation is already revoked' },
        { status: 400 }
      )
    }

    // Revoke invitation
    const { error: revokeError } = await supabase
      .from('team_invitations')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: user.id
      })
      .eq('id', invitationId)

    if (revokeError) {
      console.error('Error revoking invitation:', revokeError)
      return NextResponse.json(
        { error: 'Failed to revoke invitation' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_company_id: profile.company_id,
      p_action: 'invitation_revoked',
      p_entity_type: 'team_invitation',
      p_entity_id: invitationId,
      p_old_values: { status: invitation.status },
      p_new_values: { status: 'revoked', email: invitation.email },
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      p_user_agent: req.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      message: 'Invitation revoked successfully'
    })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
