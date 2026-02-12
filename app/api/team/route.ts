import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ROLE_PERMISSIONS, UserRole } from '@/lib/permissions'

// ============================================
// GET /api/team
// Get team directory for user's company
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

    // Get user's company ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile not found or not associated with a company' },
        { status: 404 }
      )
    }

    // Get search and filter params
    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || ''
    const status = searchParams.get('status') || 'active' // active, inactive, all
    const sortBy = searchParams.get('sortBy') || 'name' // name, role, joined
    const sortOrder = searchParams.get('sortOrder') || 'asc' // asc, desc

    // Get all team members in the company
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        phone,
        job_title,
        department,
        created_at,
        last_sign_in_at,
        is_active
      `)
      .eq('company_id', profile.company_id)

    // Apply status filter
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    // Apply search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,job_title.ilike.%${search}%`)
    }

    const { data: teamMembers, error: membersError } = await query

    if (membersError) {
      console.error('Error fetching team members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      )
    }

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({
        teamMembers: [],
        total: 0
      })
    }

    // Get role assignments for all members
    const { data: roleAssignments, error: rolesError } = await supabase
      .from('user_role_assignments')
      .select(`
        user_id,
        role_id,
        assigned_at,
        expires_at,
        project_ids,
        custom_roles:role_id (
          id,
          role_name,
          role_slug,
          color,
          icon,
          is_system_role
        )
      `)
      .in('user_id', teamMembers.map(m => m.id))
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)

    if (rolesError) {
      console.error('Error fetching role assignments:', rolesError)
    }

    // Get highest role for each member
    const memberRolesPromises = teamMembers.map(async (member) => {
      const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
        user_uuid: member.id,
        p_company_id: profile.company_id
      })
      return { userId: member.id, highestRole: highestRole || 'viewer' }
    })

    const memberRoles = await Promise.all(memberRolesPromises)

    // Combine data
    const enrichedMembers = teamMembers.map(member => {
      const memberRoleData = memberRoles.find(r => r.userId === member.id)
      const memberAssignments = roleAssignments?.filter(ra => ra.user_id === member.id) || []

      return {
        ...member,
        highestRole: memberRoleData?.highestRole || 'viewer',
        roles: memberAssignments.map(ra => ({
          roleId: ra.role_id,
          roleName: (ra as any).custom_roles?.role_name || 'Unknown',
          roleSlug: (ra as any).custom_roles?.role_slug,
          color: (ra as any).custom_roles?.color,
          icon: (ra as any).custom_roles?.icon,
          isSystemRole: (ra as any).custom_roles?.is_system_role,
          assignedAt: ra.assigned_at,
          expiresAt: ra.expires_at,
          projectIds: ra.project_ids
        })),
        isExpiringSoon: memberAssignments.some(ra => {
          if (!ra.expires_at) return false
          const expiresAt = new Date(ra.expires_at)
          const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          return daysUntilExpiry > 0 && daysUntilExpiry <= 7
        })
      }
    })

    // Apply role filter
    let filteredMembers = enrichedMembers
    if (roleFilter) {
      filteredMembers = enrichedMembers.filter(member =>
        member.roles.some(r => r.roleSlug === roleFilter || r.roleId === roleFilter)
      )
    }

    // Sort members
    filteredMembers.sort((a, b) => {
      let compareA: any, compareB: any

      switch (sortBy) {
        case 'name':
          compareA = a.full_name?.toLowerCase() || ''
          compareB = b.full_name?.toLowerCase() || ''
          break
        case 'role':
          compareA = a.highestRole
          compareB = b.highestRole
          break
        case 'joined':
          compareA = new Date(a.created_at).getTime()
          compareB = new Date(b.created_at).getTime()
          break
        case 'lastActive':
          compareA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
          compareB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
          break
        default:
          compareA = a.full_name?.toLowerCase() || ''
          compareB = b.full_name?.toLowerCase() || ''
      }

      if (sortOrder === 'desc') {
        return compareA < compareB ? 1 : compareA > compareB ? -1 : 0
      } else {
        return compareA > compareB ? 1 : compareA < compareB ? -1 : 0
      }
    })

    // Get team statistics
    const stats = {
      totalMembers: enrichedMembers.length,
      activeMembers: enrichedMembers.filter(m => m.is_active).length,
      inactiveMembers: enrichedMembers.filter(m => !m.is_active).length,
      expiringRoles: enrichedMembers.filter(m => m.isExpiringSoon).length,
      roleDistribution: enrichedMembers.reduce((acc, member) => {
        const role = member.highestRole
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      teamMembers: filteredMembers,
      total: filteredMembers.length,
      stats
    })
  } catch (error) {
    console.error('Error fetching team directory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/team
// Update team member status (activate/deactivate)
// ============================================

export async function PATCH(req: NextRequest) {
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
        { error: 'Forbidden: You do not have permission to manage team members' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { userId, isActive } = body

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: userId and isActive' },
        { status: 400 }
      )
    }

    // Get company IDs
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('company_id, email, full_name')
      .eq('id', userId)
      .single()

    if (!requesterProfile || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify same company
    if (requesterProfile.company_id !== targetProfile.company_id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot manage users in other companies' },
        { status: 403 }
      )
    }

    // Prevent self-deactivation
    if (userId === user.id && !isActive) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Update user status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user status' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_company_id: requesterProfile.company_id,
      p_action: isActive ? 'user_activated' : 'user_deactivated',
      p_entity_type: 'profile',
      p_entity_id: userId,
      p_old_values: { isActive: !isActive },
      p_new_values: {
        isActive,
        targetUserEmail: targetProfile.email,
        targetUserName: targetProfile.full_name
      },
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      p_user_agent: req.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    console.error('Error updating team member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
