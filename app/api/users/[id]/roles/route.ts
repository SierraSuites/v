import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ROLE_PERMISSIONS, UserRole } from '@/lib/permissions'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const assignRoleSchema = z.object({
  roleId: z.string().uuid('Role ID must be a valid UUID'),
  projectIds: z.array(z.string().uuid()).optional(), // Optional: limit role to specific projects
  expiresAt: z.string().datetime().optional() // Optional: temporary role assignment
})

const removeRoleSchema = z.object({
  roleId: z.string().uuid('Role ID must be a valid UUID')
})

// ============================================
// MIDDLEWARE: Check permissions
// ============================================

async function checkUserPermissions(userId: string) {
  const supabase = await createClient()

  const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
    user_uuid: userId
  })

  const userPermissions = ROLE_PERMISSIONS[highestRole as UserRole] || ROLE_PERMISSIONS.viewer

  if (!userPermissions.canChangeRoles) {
    return {
      hasPermission: false,
      error: NextResponse.json(
        { error: 'Forbidden: You do not have permission to manage user roles' },
        { status: 403 }
      )
    }
  }

  return { hasPermission: true }
}

// ============================================
// GET /api/users/[id]/roles
// Get all roles assigned to a specific user
// ============================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Await params in Next.js 15
    const { id: targetUserId } = await params

    // Get user's company to ensure same-company access
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', targetUserId)
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
        { error: 'Forbidden: Cannot view roles for users in other companies' },
        { status: 403 }
      )
    }

    // Get user's role assignments
    const { data: roleAssignments, error: rolesError } = await supabase
      .from('user_role_assignments')
      .select(`
        id,
        role_id,
        project_ids,
        assigned_at,
        assigned_by,
        expires_at,
        custom_roles:role_id (
          id,
          role_name,
          role_slug,
          color,
          icon,
          permissions,
          is_system_role
        )
      `)
      .eq('user_id', targetUserId)
      .eq('company_id', targetProfile.company_id)
      .is('deleted_at', null)

    if (rolesError) {
      console.error('Error fetching role assignments:', rolesError)
      return NextResponse.json(
        { error: 'Failed to fetch role assignments' },
        { status: 500 }
      )
    }

    // Get highest role for display
    const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
      user_uuid: targetUserId,
      p_company_id: targetProfile.company_id
    })

    // Get merged permissions
    const { data: mergedPermissions } = await supabase.rpc('get_user_permissions', {
      p_user_id: targetUserId,
      p_company_id: targetProfile.company_id
    })

    return NextResponse.json({
      userId: targetUserId,
      highestRole: highestRole || 'viewer',
      mergedPermissions: mergedPermissions || {},
      roleAssignments: roleAssignments || []
    })
  } catch (error) {
    console.error('Error fetching user roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/users/[id]/roles
// Assign a role to a user
// ============================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const permissionCheck = await checkUserPermissions(user.id)
    if (!permissionCheck.hasPermission) {
      return permissionCheck.error
    }

    // Await params in Next.js 15
    const { id: targetUserId } = await params

    // Parse and validate request body
    const body = await req.json()
    const validationResult = assignRoleSchema.safeParse(body)

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

    const { roleId, projectIds, expiresAt } = validationResult.data

    // Get company IDs for both users
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('company_id, email, full_name')
      .eq('id', targetUserId)
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
        { error: 'Forbidden: Cannot assign roles to users in other companies' },
        { status: 403 }
      )
    }

    // Verify role exists and belongs to the company
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

    // System roles should have NULL company_id, custom roles should match
    if (!role.is_system_role && role.company_id !== targetProfile.company_id) {
      return NextResponse.json(
        { error: 'Role does not belong to this company' },
        { status: 403 }
      )
    }

    // Check if user already has this role
    const { data: existingAssignment } = await supabase
      .from('user_role_assignments')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('role_id', roleId)
      .eq('company_id', targetProfile.company_id)
      .is('deleted_at', null)
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User already has this role assigned' },
        { status: 409 }
      )
    }

    // Create role assignment
    const { data: assignment, error: assignError } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id: targetUserId,
        role_id: roleId,
        company_id: targetProfile.company_id,
        assigned_by: user.id,
        project_ids: projectIds || null,
        expires_at: expiresAt || null
      })
      .select()
      .single()

    if (assignError) {
      console.error('Error assigning role:', assignError)
      return NextResponse.json(
        { error: 'Failed to assign role' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_company_id: targetProfile.company_id,
      p_action: 'role_assigned',
      p_entity_type: 'user_role_assignment',
      p_entity_id: assignment.id,
      p_old_values: null,
      p_new_values: {
        targetUserId,
        targetUserEmail: targetProfile.email,
        targetUserName: targetProfile.full_name,
        roleId,
        roleName: role.role_name,
        projectIds,
        expiresAt
      },
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      p_user_agent: req.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(
      {
        message: 'Role assigned successfully',
        assignment
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error assigning role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/users/[id]/roles
// Remove a role from a user
// ============================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const permissionCheck = await checkUserPermissions(user.id)
    if (!permissionCheck.hasPermission) {
      return permissionCheck.error
    }

    // Await params in Next.js 15
    const { id: targetUserId } = await params

    // Parse and validate request body
    const body = await req.json()
    const validationResult = removeRoleSchema.safeParse(body)

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

    const { roleId } = validationResult.data

    // Get company IDs
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('company_id, email, full_name')
      .eq('id', targetUserId)
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
        { error: 'Forbidden: Cannot remove roles from users in other companies' },
        { status: 403 }
      )
    }

    // Find the assignment
    const { data: assignment, error: findError } = await supabase
      .from('user_role_assignments')
      .select(`
        id,
        custom_roles:role_id (
          role_name
        )
      `)
      .eq('user_id', targetUserId)
      .eq('role_id', roleId)
      .eq('company_id', targetProfile.company_id)
      .is('deleted_at', null)
      .single()

    if (findError || !assignment) {
      return NextResponse.json(
        { error: 'Role assignment not found' },
        { status: 404 }
      )
    }

    // Soft delete the assignment
    const { error: deleteError } = await supabase
      .from('user_role_assignments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', assignment.id)

    if (deleteError) {
      console.error('Error removing role:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove role' },
        { status: 500 }
      )
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_company_id: targetProfile.company_id,
      p_action: 'role_removed',
      p_entity_type: 'user_role_assignment',
      p_entity_id: assignment.id,
      p_old_values: {
        targetUserId,
        targetUserEmail: targetProfile.email,
        targetUserName: targetProfile.full_name,
        roleId,
        roleName: (assignment as any).custom_roles?.role_name
      },
      p_new_values: null,
      p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      p_user_agent: req.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      message: 'Role removed successfully'
    })
  } catch (error) {
    console.error('Error removing role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
