import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permissionService, type PermissionSet } from '@/lib/permissions'

// ============================================
// API PERMISSION MIDDLEWARE
// ============================================

/**
 * Require a specific permission to access an API route
 */
export async function requirePermission(
  permission: keyof PermissionSet,
  projectId?: string
): Promise<{ authorized: boolean; userId?: string; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check permission
    const hasPermission = await permissionService.hasPermission(
      permission,
      projectId,
      user.id
    )

    if (!hasPermission) {
      // Log permission denial
      await permissionService.logPermissionCheck(
        `api_access_${permission}`,
        'api_route',
        projectId || 'global',
        false,
        'Insufficient permissions'
      )

      return {
        authorized: false,
        userId: user.id,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: `You do not have permission to ${permission.replace('can', '').toLowerCase()}`,
            requiredPermission: permission
          },
          { status: 403 }
        )
      }
    }

    // Log successful permission check
    await permissionService.logPermissionCheck(
      `api_access_${permission}`,
      'api_route',
      projectId || 'global',
      true
    )

    return {
      authorized: true,
      userId: user.id
    }
  } catch (error) {
    console.error('Error checking permissions:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error', message: 'Failed to check permissions' },
        { status: 500 }
      )
    }
  }
}

/**
 * Require multiple permissions (all must be granted)
 */
export async function requirePermissions(
  permissions: (keyof PermissionSet)[],
  projectId?: string
): Promise<{ authorized: boolean; userId?: string; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check all permissions
    const permissionChecks = await permissionService.hasPermissions(
      permissions,
      projectId,
      user.id
    )

    const missingPermissions = permissions.filter(p => !permissionChecks[p])

    if (missingPermissions.length > 0) {
      return {
        authorized: false,
        userId: user.id,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have the required permissions',
            missingPermissions
          },
          { status: 403 }
        )
      }
    }

    return {
      authorized: true,
      userId: user.id
    }
  } catch (error) {
    console.error('Error checking permissions:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error', message: 'Failed to check permissions' },
        { status: 500 }
      )
    }
  }
}

/**
 * Check if user owns a resource
 */
export async function requireResourceOwnership(
  resourceType: 'media_asset' | 'project' | 'task',
  resourceId: string
): Promise<{ authorized: boolean; userId?: string; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check ownership based on resource type
    let isOwner = false

    if (resourceType === 'media_asset') {
      const { data } = await supabase
        .from('media_assets')
        .select('user_id')
        .eq('id', resourceId)
        .single()

      isOwner = data?.user_id === user.id
    } else if (resourceType === 'project') {
      const { data } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', resourceId)
        .single()

      isOwner = data?.created_by === user.id
    } else if (resourceType === 'task') {
      const { data } = await supabase
        .from('tasks')
        .select('user_id')
        .eq('id', resourceId)
        .single()

      isOwner = data?.user_id === user.id
    }

    if (!isOwner) {
      return {
        authorized: false,
        userId: user.id,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not own this resource'
          },
          { status: 403 }
        )
      }
    }

    return {
      authorized: true,
      userId: user.id
    }
  } catch (error) {
    console.error('Error checking resource ownership:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error', message: 'Failed to check ownership' },
        { status: 500 }
      )
    }
  }
}

/**
 * Check if user can access a media asset (view permission)
 */
export async function requireMediaAssetAccess(
  mediaAssetId: string
): Promise<{ authorized: boolean; userId?: string; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check if user can view the media asset
    const canView = await permissionService.canViewMediaAsset(mediaAssetId, user.id)

    if (!canView) {
      return {
        authorized: false,
        userId: user.id,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have access to this photo'
          },
          { status: 403 }
        )
      }
    }

    return {
      authorized: true,
      userId: user.id
    }
  } catch (error) {
    console.error('Error checking media asset access:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error', message: 'Failed to check access' },
        { status: 500 }
      )
    }
  }
}

/**
 * Check if user can delete a media asset
 */
export async function requireMediaAssetDeletePermission(
  mediaAssetId: string
): Promise<{ authorized: boolean; userId?: string; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check if user can delete the media asset
    const canDelete = await permissionService.canDeleteMediaAsset(mediaAssetId, user.id)

    if (!canDelete) {
      return {
        authorized: false,
        userId: user.id,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have permission to delete this photo'
          },
          { status: 403 }
        )
      }
    }

    return {
      authorized: true,
      userId: user.id
    }
  } catch (error) {
    console.error('Error checking delete permission:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error', message: 'Failed to check delete permission' },
        { status: 500 }
      )
    }
  }
}

/**
 * Require team membership
 */
export async function requireTeamMembership(
  teamId: string
): Promise<{ authorized: boolean; userId?: string; role?: string; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .is('removed_at', null)
      .single()

    if (!membership) {
      return {
        authorized: false,
        userId: user.id,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You are not a member of this team'
          },
          { status: 403 }
        )
      }
    }

    return {
      authorized: true,
      userId: user.id,
      role: membership.role
    }
  } catch (error) {
    console.error('Error checking team membership:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error', message: 'Failed to check team membership' },
        { status: 500 }
      )
    }
  }
}

/**
 * Require project access
 */
export async function requireProjectAccess(
  projectId: string
): Promise<{ authorized: boolean; userId?: string; role?: string; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Check if user has access to project via team membership
    const accessibleProjects = await permissionService.getUserAccessibleProjects(user.id)

    if (!accessibleProjects.includes(projectId)) {
      return {
        authorized: false,
        userId: user.id,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have access to this project'
          },
          { status: 403 }
        )
      }
    }

    // Get user's role for this project
    const role = await permissionService.getUserProjectRole(projectId, user.id)

    return {
      authorized: true,
      userId: user.id,
      role
    }
  } catch (error) {
    console.error('Error checking project access:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error', message: 'Failed to check project access' },
        { status: 500 }
      )
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get authenticated user
 */
export async function getAuthenticatedUser(): Promise<{
  user: any | null
  error?: NextResponse
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    return { user }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Internal server error', message: 'Failed to authenticate' },
        { status: 500 }
      )
    }
  }
}

/**
 * Extract project ID from request body or query params
 */
export function getProjectIdFromRequest(request: NextRequest): string | null {
  try {
    // Try URL search params
    const { searchParams } = new URL(request.url)
    const projectIdFromQuery = searchParams.get('projectId') || searchParams.get('project_id')

    if (projectIdFromQuery) {
      return projectIdFromQuery
    }

    // Note: Can't easily get from body in middleware without consuming stream
    // Body parsing should be done in the route handler
    return null
  } catch (error) {
    console.error('Error extracting project ID:', error)
    return null
  }
}
