import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { customRolesService } from '@/lib/custom-roles'
import { ROLE_PERMISSIONS, UserRole, getRoleDisplayName, getRoleColor, getRoleIcon, getRoleLevel } from '@/lib/permissions'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createRoleSchema = z.object({
  roleName: z.string()
    .min(3, 'Role name must be at least 3 characters')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    .default('#6B7280'),
  icon: z.string().max(10, 'Icon must be 10 characters or less').default('👤'),
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
  })
})

// ============================================
// GET /api/roles
// List all built-in roles + custom roles for user's company
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

    // Build built-in roles array
    const builtInRoles = Object.keys(ROLE_PERMISSIONS).map((role) => ({
      id: role,
      role_name: getRoleDisplayName(role as UserRole),
      role_slug: role,
      description: getBuiltInRoleDescription(role as UserRole),
      color: getRoleColor(role as UserRole),
      icon: getRoleIcon(role as UserRole),
      permissions: ROLE_PERMISSIONS[role as UserRole],
      is_builtin: true,
      role_level: getRoleLevel(role as UserRole)
    }))

    // Get custom roles for the company
    const customRoles = await customRolesService.getCompanyCustomRoles(profile.company_id)

    // Get member counts for custom roles
    const customRolesWithCounts = await Promise.all(
      customRoles.map(async (role) => ({
        ...role,
        is_builtin: false,
        member_count: await customRolesService.getRoleMemberCount(role.id)
      }))
    )

    return NextResponse.json({
      builtInRoles,
      customRoles: customRolesWithCounts
    })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/roles
// Create a new custom role
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

    // Get user's company ID and check permissions
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

    // Check if user has permission to manage team
    const { data: highestRole } = await supabase.rpc('get_user_highest_role', {
      user_uuid: user.id
    })

    const userPermissions = ROLE_PERMISSIONS[highestRole as UserRole] || ROLE_PERMISSIONS.viewer

    if (!userPermissions.canManageTeam) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create custom roles' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = createRoleSchema.safeParse(body)

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

    const { roleName, description, color, icon, permissions } = validationResult.data

    // Create the custom role
    const customRole = await customRolesService.createCustomRole(
      profile.company_id,
      roleName,
      permissions,
      { description, color, icon }
    )

    return NextResponse.json(
      {
        message: 'Custom role created successfully',
        role: customRole
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating custom role:', error)

    // Handle specific error cases
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 } // Conflict
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getBuiltInRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full access to all features, settings, and company management. Can manage all users and permissions.',
    superintendent: 'Senior field leadership with full project and team management. Can oversee multiple projects and manage budgets.',
    project_manager: 'Manages assigned projects including tasks, schedules, budgets, and documentation. Limited to assigned projects.',
    field_engineer: 'Field worker who can upload photos and documents, view tasks, and access assigned project information.',
    viewer: 'Read-only access to shared content. Cannot make changes or upload files.',
    accountant: 'Full access to financial data, invoicing, expenses, and reporting. Read-only access to projects and analytics.',
    subcontractor: 'Limited access to assigned tasks and punch lists. Can upload work documentation and resolve assigned items.'
  }
  return descriptions[role]
}
