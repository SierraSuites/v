import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ROLE_PERMISSIONS, UserRole, getRoleDisplayName } from '@/lib/permissions'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Role is required'),
  fullName: z.string().min(2).optional(),
  message: z.string().max(500).optional(),
})

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase admin credentials')
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// ============================================
// POST /api/team/invite
// ============================================
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get inviter profile + permission check
    const { data: inviterProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id, full_name')
      .eq('id', user.id)
      .single()

    if (!inviterProfile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userPermissions = ROLE_PERMISSIONS[inviterProfile.role as UserRole] || ROLE_PERMISSIONS.viewer
    if (!userPermissions.canInviteMembers) {
      return NextResponse.json({ error: 'You do not have permission to invite members' }, { status: 403 })
    }

    // Validate body
    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }

    const { email, roleId, fullName, message } = parsed.data

    // Check if already a member
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, company_id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser?.company_id === inviterProfile.company_id) {
      return NextResponse.json({ error: 'User is already a member of your company' }, { status: 409 })
    }

    // Resolve role — accept UUID or slug
    let role: { id: string; role_name: string; role_slug: string } | null = null

    if (isUUID(roleId)) {
      const { data } = await supabase
        .from('custom_roles')
        .select('id, role_name, role_slug')
        .eq('id', roleId)
        .single()
      role = data
    }

    if (!role) {
      const { data } = await supabase
        .from('custom_roles')
        .select('id, role_name, role_slug')
        .eq('role_slug', roleId)
        .single()
      role = data
    }

    // Final fallback: treat roleId as a built-in slug directly
    if (!role && roleId in ROLE_PERMISSIONS) {
      role = {
        id: roleId,
        role_name: getRoleDisplayName(roleId as UserRole),
        role_slug: roleId
      }
    }

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Get company name for the email
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', inviterProfile.company_id)
      .single()

    // Send invite via Supabase — this sends the email and creates the auth user
    const adminClient = getAdminClient()
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        data: {
          // Passed into raw_user_meta_data — trigger reads these
          full_name: fullName || null,
          invited_company_id: inviterProfile.company_id,
          invited_role: role.role_slug,
          invited_by: user.id,
        },
      }
    )

    if (inviteError) {
      console.error('Supabase invite error:', inviteError)
      // "User already registered" means they have an account — handle gracefully
      if (inviteError.message?.toLowerCase().includes('already registered')) {
        return NextResponse.json({ error: 'A user with this email already exists. Ask them to contact you directly to join.' }, { status: 409 })
      }
      return NextResponse.json({ error: inviteError.message || 'Failed to send invitation' }, { status: 500 })
    }

    // Record the invite for tracking / audit (optional but useful for the UI)
    await supabase.from('team_invitations').insert({
      company_id: inviterProfile.company_id,
      email: email.toLowerCase(),
      role_id: role.id,
      invited_by: user.id,
      full_name: fullName || null,
      custom_message: message || null,
      invitation_token: inviteData.user.id, // repurpose field to store auth user id
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'sent',
    }).select().single()

    return NextResponse.json(
      {
        message: `Invitation sent to ${email}`,
        invitation: {
          email,
          role: role.role_name,
          company: company?.name,
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// GET /api/team/invite — list pending invites
// ============================================
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userPermissions = ROLE_PERMISSIONS[profile.role as UserRole] || ROLE_PERMISSIONS.viewer
    if (!userPermissions.canManageTeam) {
      return NextResponse.json({ error: 'You do not have permission to view invitations' }, { status: 403 })
    }

    const { data: invitations, error: invitesError } = await supabase
      .from('team_invitations')
      .select(`
        id, email, full_name, status, created_at, expires_at,
        role:role_id ( id, role_name, role_slug ),
        inviter:invited_by ( id, full_name, email )
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (invitesError) {
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invitations: invitations || [], total: invitations?.length || 0 })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// DELETE /api/team/invite — revoke an invite
// ============================================
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userPermissions = ROLE_PERMISSIONS[profile.role as UserRole] || ROLE_PERMISSIONS.viewer
    if (!userPermissions.canManageTeam) {
      return NextResponse.json({ error: 'You do not have permission to revoke invitations' }, { status: 403 })
    }

    const invitationId = req.nextUrl.searchParams.get('id')
    if (!invitationId) {
      return NextResponse.json({ error: 'Missing invitation ID' }, { status: 400 })
    }

    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('id, company_id, status')
      .eq('id', invitationId)
      .single()

    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    if (invitation.company_id !== profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (invitation.status === 'accepted') return NextResponse.json({ error: 'Cannot revoke an accepted invitation' }, { status: 400 })

    await supabase
      .from('team_invitations')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: user.id })
      .eq('id', invitationId)

    return NextResponse.json({ message: 'Invitation revoked' })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
