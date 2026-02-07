import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { customRolesService } from '@/lib/custom-roles'
import { ROLE_PERMISSIONS, UserRole } from '@/lib/permissions'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateRoleSchema = z.object({
  roleName: z.string()
    .min(3, 'Role name must be at least 3 characters')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores')
    .optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').nullable().optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    .optional(),
  icon: z.string().max(10, 'Icon must be 10 characters or less').optional(),
  permissions: z.object({
    // Project Permissions
    canViewAllProjects: z.boolean(),
    canEditProjects: z.boolean(),
    canDeleteProjects: z.boolean(),
    canCreateProjects: z.boolean(),
    // Team Permissions
    canManageTeam: z.boolean(),
    canInviteMembers: z.boolean(),
    canRemoveMembers: z.boolean(),
    canChangeRoles: z.boolean(),
    // Photo Permissions
    canViewAllPhotos: z.boolean(),
    canUploadPhotos: z.boolean(),
    canDeletePhotos: z.boolean(),
    canSharePhotos: z.boolean(),
    canEditPhotoMetadata: z.boolean(),
    // Analytics
    canViewAnalytics: z.boolean(),
    canExportData: z.boolean(),
    canViewReports: z.boolean(),
    // AI Features
    canManageAI: z.boolean(),
    canRunAIAnalysis: z.boolean(),
    canViewAIInsights: z.boolean(),
    // Tasks
    canManageTasks: z.boolean(),
    canAssignTasks: z.boolean(),
    canViewAllTasks: z.boolean(),
    // Punch List
    canManagePunchList: z.boolean(),
    canResolvePunchItems: z.boolean(),
    canViewPunchList: z.boolean(),
    // Financial
    canManageFinances: z.boolean(),
    canApproveExpenses: z.boolean(),
    canViewFinancials: z.boolean(),
    // Documents
    canUploadDocuments: z.boolean(),
    canDeleteDocuments: z.boolean(),
    canShareDocuments: z.boolean(),
    // Settings
    canManageCompanySettings: z.boolean(),
    canManageIntegrations: z.boolean()
  }).optional()
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

  if (!userPermissions.canManageTeam) {
    return {
      hasPermission: false,
      error: NextResponse.json(
        { error: 'Forbidden: You do not have permission to manage roles' },
        { status: 403 }
      )
    }
  }

  return { hasPermission: true }
}

// ============================================
// GET /api/roles/[id]
// Get a specific custom role
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
    const { id } = await params

    // Get the custom role
    const role = await customRolesService.getCustomRole(id)

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Verify role belongs to user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.company_id !== role.company_id) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Get member count
    const memberCount = await customRolesService.getRoleMemberCount(role.id)

    return NextResponse.json({
      ...role,
      member_count: memberCount
    })
  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT /api/roles/[id]
// Update a custom role
// ============================================

export async function PUT(
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
    const { id } = await params

    // Verify role exists and belongs to user's company
    const role = await customRolesService.getCustomRole(id)
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.company_id !== role.company_id) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = updateRoleSchema.safeParse(body)

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

    const updates = validationResult.data

    // Update the role
    const updatedRole = await customRolesService.updateCustomRole(id, {
      role_name: updates.roleName,
      description: updates.description,
      color: updates.color,
      icon: updates.icon,
      permissions: updates.permissions
    })

    return NextResponse.json({
      message: 'Role updated successfully',
      role: updatedRole
    })
  } catch (error: any) {
    console.error('Error updating role:', error)

    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/roles/[id]
// Soft delete a custom role
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
    const { id } = await params

    // Verify role exists and belongs to user's company
    const role = await customRolesService.getCustomRole(id)
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.company_id !== role.company_id) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Check if role is in use
    const memberCount = await customRolesService.getRoleMemberCount(id)

    if (memberCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete role that is assigned to team members',
          memberCount
        },
        { status: 409 } // Conflict
      )
    }

    // Delete the role (soft delete)
    await customRolesService.deleteCustomRole(id)

    return NextResponse.json({
      message: 'Role deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
