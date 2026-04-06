import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    canViewAllProjects: z.boolean(),
    canEditProjects: z.boolean(),
    canDeleteProjects: z.boolean(),
    canCreateProjects: z.boolean(),
    canManageTeam: z.boolean(),
    canInviteMembers: z.boolean(),
    canRemoveMembers: z.boolean(),
    canChangeRoles: z.boolean(),
    canViewAllPhotos: z.boolean(),
    canUploadPhotos: z.boolean(),
    canDeletePhotos: z.boolean(),
    canSharePhotos: z.boolean(),
    canEditPhotoMetadata: z.boolean(),
    canViewAnalytics: z.boolean(),
    canExportData: z.boolean(),
    canViewReports: z.boolean(),
    canManageAI: z.boolean(),
    canRunAIAnalysis: z.boolean(),
    canViewAIInsights: z.boolean(),
    canManageTasks: z.boolean(),
    canAssignTasks: z.boolean(),
    canViewAllTasks: z.boolean(),
    canManagePunchList: z.boolean(),
    canResolvePunchItems: z.boolean(),
    canViewPunchList: z.boolean(),
    canManageFinances: z.boolean(),
    canApproveExpenses: z.boolean(),
    canViewFinancials: z.boolean(),
    canUploadDocuments: z.boolean(),
    canDeleteDocuments: z.boolean(),
    canShareDocuments: z.boolean(),
    canManageCompanySettings: z.boolean(),
    canManageIntegrations: z.boolean()
  }).optional()
})

// ============================================
// HELPERS
// ============================================

async function getAuthedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

async function getUserProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('company_id, role')
    .eq('id', userId)
    .single()
  return data
}

async function getRole(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase
    .from('custom_roles')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  return data
}

async function getMemberCount(supabase: Awaited<ReturnType<typeof createClient>>, roleId: string) {
  const { count } = await supabase
    .from('user_role_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', roleId)
  return count ?? 0
}

// ============================================
// GET /api/roles/[id]
// ============================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const user = await getAuthedUser(supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(supabase, user.id)
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const role = await getRole(supabase, id)
    if (!role || (role.company_id && role.company_id !== profile.company_id)) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    const memberCount = await getMemberCount(supabase, id)

    return NextResponse.json({ ...role, member_count: memberCount })
  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// PUT /api/roles/[id]
// ============================================

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const user = await getAuthedUser(supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(supabase, user.id)
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const userPermissions = ROLE_PERMISSIONS[profile.role as UserRole] || ROLE_PERMISSIONS.viewer
    if (!userPermissions.canManageTeam) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    }

    const role = await getRole(supabase, id)
    if (!role || role.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.is_system_role) {
      return NextResponse.json({ error: 'Cannot modify system roles' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }

    const { roleName, description, color, icon, permissions } = parsed.data
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (roleName !== undefined) updates.role_name = roleName
    if (description !== undefined) updates.description = description
    if (color !== undefined) updates.color = color
    if (icon !== undefined) updates.icon = icon
    if (permissions !== undefined) updates.permissions = permissions

    const { data: updatedRole, error: updateError } = await supabase
      .from('custom_roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 })
      }
      throw updateError
    }

    return NextResponse.json({ message: 'Role updated successfully', role: updatedRole })
  } catch (error: any) {
    console.error('Error updating role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// DELETE /api/roles/[id]
// ============================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const user = await getAuthedUser(supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(supabase, user.id)
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const userPermissions = ROLE_PERMISSIONS[profile.role as UserRole] || ROLE_PERMISSIONS.viewer
    if (!userPermissions.canManageTeam) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    }

    const role = await getRole(supabase, id)
    if (!role || role.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.is_system_role) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 403 })
    }

    const memberCount = await getMemberCount(supabase, id)
    if (memberCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role that is assigned to team members', memberCount },
        { status: 409 }
      )
    }

    await supabase.from('custom_roles').update({ is_active: false }).eq('id', id)

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
