import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

export type UserRole = 'admin' | 'superintendent' | 'project_manager' | 'field_engineer' | 'viewer'

export interface PermissionSet {
  // Project Permissions
  canViewAllProjects: boolean
  canEditProjects: boolean
  canDeleteProjects: boolean
  canCreateProjects: boolean

  // Team Permissions
  canManageTeam: boolean
  canInviteMembers: boolean
  canRemoveMembers: boolean
  canChangeRoles: boolean

  // Photo Permissions
  canViewAllPhotos: boolean
  canUploadPhotos: boolean
  canDeletePhotos: boolean
  canSharePhotos: boolean
  canEditPhotoMetadata: boolean

  // Analytics & Reporting
  canViewAnalytics: boolean
  canExportData: boolean
  canViewReports: boolean

  // AI Features
  canManageAI: boolean
  canRunAIAnalysis: boolean
  canViewAIInsights: boolean

  // Task Management
  canManageTasks: boolean
  canAssignTasks: boolean
  canViewAllTasks: boolean

  // Punch List
  canManagePunchList: boolean
  canResolvePunchItems: boolean
  canViewPunchList: boolean
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: UserRole
  is_lead: boolean
  added_by: string
  added_at: string
  removed_at: string | null
  user?: any // Joined user data
}

export interface CompanyTeam {
  id: string
  company_id: string
  name: string
  description: string | null
  team_type: 'construction' | 'management' | 'quality' | 'safety' | 'custom'
  color: string
  avatar_url: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  member_count?: number
  project_count?: number
}

export interface SharedMediaAsset {
  id: string
  media_asset_id: string
  shared_with_team_id: string | null
  shared_with_user_id: string | null
  shared_by: string
  permission_level: 'view' | 'comment' | 'edit'
  expires_at: string | null
  share_message: string | null
  is_active: boolean
  shared_at: string
  last_accessed_at: string | null
  access_count: number
}

// ============================================
// ROLE PERMISSIONS MATRIX
// ============================================

export const ROLE_PERMISSIONS: Record<UserRole, PermissionSet> = {
  admin: {
    // Project
    canViewAllProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canCreateProjects: true,
    // Team
    canManageTeam: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canChangeRoles: true,
    // Photos
    canViewAllPhotos: true,
    canUploadPhotos: true,
    canDeletePhotos: true,
    canSharePhotos: true,
    canEditPhotoMetadata: true,
    // Analytics
    canViewAnalytics: true,
    canExportData: true,
    canViewReports: true,
    // AI
    canManageAI: true,
    canRunAIAnalysis: true,
    canViewAIInsights: true,
    // Tasks
    canManageTasks: true,
    canAssignTasks: true,
    canViewAllTasks: true,
    // Punch List
    canManagePunchList: true,
    canResolvePunchItems: true,
    canViewPunchList: true
  },

  superintendent: {
    // Project
    canViewAllProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canCreateProjects: true,
    // Team
    canManageTeam: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canChangeRoles: false, // Can't change admin roles
    // Photos
    canViewAllPhotos: true,
    canUploadPhotos: true,
    canDeletePhotos: true,
    canSharePhotos: true,
    canEditPhotoMetadata: true,
    // Analytics
    canViewAnalytics: true,
    canExportData: true,
    canViewReports: true,
    // AI
    canManageAI: true,
    canRunAIAnalysis: true,
    canViewAIInsights: true,
    // Tasks
    canManageTasks: true,
    canAssignTasks: true,
    canViewAllTasks: true,
    // Punch List
    canManagePunchList: true,
    canResolvePunchItems: true,
    canViewPunchList: true
  },

  project_manager: {
    // Project
    canViewAllProjects: false, // Only assigned projects
    canEditProjects: true,
    canDeleteProjects: false,
    canCreateProjects: false,
    // Team
    canManageTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    // Photos
    canViewAllPhotos: false, // Only project photos
    canUploadPhotos: true,
    canDeletePhotos: false, // Only own photos
    canSharePhotos: true,
    canEditPhotoMetadata: true,
    // Analytics
    canViewAnalytics: true,
    canExportData: true,
    canViewReports: true,
    // AI
    canManageAI: false,
    canRunAIAnalysis: true,
    canViewAIInsights: true,
    // Tasks
    canManageTasks: true,
    canAssignTasks: true,
    canViewAllTasks: false, // Only project tasks
    // Punch List
    canManagePunchList: true,
    canResolvePunchItems: true,
    canViewPunchList: true
  },

  field_engineer: {
    // Project
    canViewAllProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canCreateProjects: false,
    // Team
    canManageTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    // Photos
    canViewAllPhotos: false,
    canUploadPhotos: true,
    canDeletePhotos: false, // Only own photos
    canSharePhotos: false,
    canEditPhotoMetadata: false,
    // Analytics
    canViewAnalytics: false,
    canExportData: false,
    canViewReports: false,
    // AI
    canManageAI: false,
    canRunAIAnalysis: false,
    canViewAIInsights: true,
    // Tasks
    canManageTasks: false,
    canAssignTasks: false,
    canViewAllTasks: false, // Only assigned tasks
    // Punch List
    canManagePunchList: false,
    canResolvePunchItems: false,
    canViewPunchList: true
  },

  viewer: {
    // Project
    canViewAllProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canCreateProjects: false,
    // Team
    canManageTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canChangeRoles: false,
    // Photos
    canViewAllPhotos: false, // Only shared photos
    canUploadPhotos: false,
    canDeletePhotos: false,
    canSharePhotos: false,
    canEditPhotoMetadata: false,
    // Analytics
    canViewAnalytics: false,
    canExportData: false,
    canViewReports: false,
    // AI
    canManageAI: false,
    canRunAIAnalysis: false,
    canViewAIInsights: false,
    // Tasks
    canManageTasks: false,
    canAssignTasks: false,
    canViewAllTasks: false,
    // Punch List
    canManagePunchList: false,
    canResolvePunchItems: false,
    canViewPunchList: true
  }
}

// ============================================
// PERMISSION SERVICE
// ============================================

export const permissionService = {
  /**
   * Get user's highest role across all teams
   */
  async getUserHighestRole(userId?: string): Promise<UserRole> {
    const supabase = createClient()

    // Get user if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 'viewer'
      targetUserId = user.id
    }

    const { data, error } = await supabase.rpc('get_user_highest_role', {
      user_uuid: targetUserId
    })

    if (error) {
      console.error('Error getting user highest role:', error)
      return 'viewer'
    }

    return (data as UserRole) || 'viewer'
  },

  /**
   * Get user's role for a specific project
   */
  async getUserProjectRole(projectId: string, userId?: string): Promise<UserRole> {
    const supabase = createClient()

    // Get user if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 'viewer'
      targetUserId = user.id
    }

    const { data, error } = await supabase.rpc('get_user_project_role', {
      user_uuid: targetUserId,
      project_uuid: projectId
    })

    if (error) {
      console.error('Error getting user project role:', error)
      return 'viewer'
    }

    return (data as UserRole) || 'viewer'
  },

  /**
   * Get permission set for a user's role
   */
  getPermissionsForRole(role: UserRole): PermissionSet {
    return ROLE_PERMISSIONS[role]
  },

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    permission: keyof PermissionSet,
    projectId?: string,
    userId?: string
  ): Promise<boolean> {
    const role = projectId
      ? await this.getUserProjectRole(projectId, userId)
      : await this.getUserHighestRole(userId)

    const permissions = this.getPermissionsForRole(role)
    return permissions[permission]
  },

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    permissionKeys: (keyof PermissionSet)[],
    projectId?: string,
    userId?: string
  ): Promise<Record<keyof PermissionSet, boolean>> {
    const role = projectId
      ? await this.getUserProjectRole(projectId, userId)
      : await this.getUserHighestRole(userId)

    const permissions = this.getPermissionsForRole(role)
    const result: any = {}

    for (const key of permissionKeys) {
      result[key] = permissions[key]
    }

    return result
  },

  /**
   * Get all projects user can access
   */
  async getUserAccessibleProjects(userId?: string): Promise<string[]> {
    const supabase = createClient()

    // Get user if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      targetUserId = user.id
    }

    // Get projects through team membership
    const { data, error } = await supabase
      .from('project_teams')
      .select(`
        project_id,
        team_id,
        team_members!inner(user_id)
      `)
      .eq('team_members.user_id', targetUserId)
      .is('removed_at', null)
      .is('team_members.removed_at', null)

    if (error) {
      console.error('Error getting accessible projects:', error)
      return []
    }

    return data?.map(pt => pt.project_id) || []
  },

  /**
   * Check if user can view a specific media asset
   */
  async canViewMediaAsset(mediaAssetId: string, userId?: string): Promise<boolean> {
    const supabase = createClient()

    // Get user if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      targetUserId = user.id
    }

    const { data, error } = await supabase.rpc('can_user_view_media_asset', {
      user_uuid: targetUserId,
      asset_uuid: mediaAssetId
    })

    if (error) {
      console.error('Error checking media asset access:', error)
      return false
    }

    return data as boolean
  },

  /**
   * Check if user can delete a specific media asset
   */
  async canDeleteMediaAsset(mediaAssetId: string, userId?: string): Promise<boolean> {
    const supabase = createClient()

    // Get user if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      targetUserId = user.id
    }

    // Get asset and check ownership
    const { data: asset } = await supabase
      .from('media_assets')
      .select('user_id, project_id')
      .eq('id', mediaAssetId)
      .single()

    if (!asset) return false

    // Owner can always delete
    if (asset.user_id === targetUserId) {
      return true
    }

    // Check if user has delete permission for the project
    if (asset.project_id) {
      const hasPermission = await this.hasPermission('canDeletePhotos', asset.project_id, targetUserId)
      return hasPermission
    }

    return false
  },

  /**
   * Get user's teams
   */
  async getUserTeams(userId?: string): Promise<CompanyTeam[]> {
    const supabase = createClient()

    // Get user if not provided
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      targetUserId = user.id
    }

    const { data, error } = await supabase
      .from('company_teams')
      .select(`
        *,
        team_members!inner(user_id, role)
      `)
      .eq('team_members.user_id', targetUserId)
      .is('team_members.removed_at', null)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error getting user teams:', error)
      return []
    }

    return data || []
  },

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:auth.users(id, email, user_metadata)
      `)
      .eq('team_id', teamId)
      .is('removed_at', null)
      .order('added_at')

    if (error) {
      console.error('Error getting team members:', error)
      return []
    }

    return data || []
  },

  /**
   * Log permission check (for audit trail)
   */
  async logPermissionCheck(
    action: string,
    resourceType: string,
    resourceId: string,
    granted: boolean,
    reason?: string
  ): Promise<void> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    try {
      await supabase.from('permission_audit_log').insert({
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        permission_granted: granted ? action : null,
        permission_denied: granted ? null : action,
        reason
      })
    } catch (error) {
      console.error('Error logging permission check:', error)
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Administrator',
    superintendent: 'Superintendent',
    project_manager: 'Project Manager',
    field_engineer: 'Field Engineer',
    viewer: 'Viewer'
  }
  return names[role]
}

/**
 * Get role color for UI
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: '#DC2626', // Red
    superintendent: '#F59E0B', // Orange
    project_manager: '#6366F1', // Indigo
    field_engineer: '#10B981', // Green
    viewer: '#6B7280' // Gray
  }
  return colors[role]
}

/**
 * Get role icon
 */
export function getRoleIcon(role: UserRole): string {
  const icons: Record<UserRole, string> = {
    admin: '👑',
    superintendent: '🏗️',
    project_manager: '📋',
    field_engineer: '🔧',
    viewer: '👁️'
  }
  return icons[role]
}

/**
 * Compare role hierarchy (higher number = more privileged)
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    admin: 5,
    superintendent: 4,
    project_manager: 3,
    field_engineer: 2,
    viewer: 1
  }
  return levels[role]
}

/**
 * Check if one role can manage another
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return getRoleLevel(managerRole) > getRoleLevel(targetRole)
}

/**
 * Get permission level color
 */
export function getPermissionLevelColor(level: 'view' | 'comment' | 'edit'): string {
  const colors = {
    view: '#6B7280',
    comment: '#6366F1',
    edit: '#F59E0B'
  }
  return colors[level]
}

/**
 * Get permission level icon
 */
export function getPermissionLevelIcon(level: 'view' | 'comment' | 'edit'): string {
  const icons = {
    view: '👁️',
    comment: '💬',
    edit: '✏️'
  }
  return icons[level]
}
