import { createClient } from '@/lib/supabase/client'
import { PermissionSet } from './permissions'

// ============================================
// TYPES
// ============================================

export interface CustomRole {
  id: string
  company_id: string
  role_name: string
  role_slug: string
  description: string | null
  color: string
  icon: string
  permissions: PermissionSet
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateCustomRoleOptions {
  description?: string
  color?: string
  icon?: string
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate URL-safe slug from role name
 * Example: "Site Safety Officer" -> "site-safety-officer"
 */
export function generateRoleSlug(roleName: string): string {
  return roleName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Validate role slug format
 */
export function isValidRoleSlug(slug: string): boolean {
  return /^[a-z0-9_-]+$/.test(slug)
}

/**
 * Validate color hex format
 */
export function isValidColorHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

// ============================================
// CUSTOM ROLES SERVICE
// ============================================

export const customRolesService = {
  /**
   * Get all active custom roles for a company
   */
  async getCompanyCustomRoles(companyId: string): Promise<CustomRole[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('role_name')

    if (error) {
      console.error('Error fetching custom roles:', error)
      throw new Error(`Failed to fetch custom roles: ${error.message}`)
    }

    return (data || []) as CustomRole[]
  },

  /**
   * Get a specific custom role by ID
   */
  async getCustomRole(roleId: string): Promise<CustomRole | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .eq('id', roleId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      console.error('Error fetching custom role:', error)
      throw new Error(`Failed to fetch custom role: ${error.message}`)
    }

    return data as CustomRole
  },

  /**
   * Get a custom role by slug within a company
   */
  async getCustomRoleBySlug(companyId: string, slug: string): Promise<CustomRole | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .eq('company_id', companyId)
      .eq('role_slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching custom role by slug:', error)
      throw new Error(`Failed to fetch custom role: ${error.message}`)
    }

    return data as CustomRole
  },

  /**
   * Create a new custom role
   */
  async createCustomRole(
    companyId: string,
    roleName: string,
    permissions: PermissionSet,
    options: CreateCustomRoleOptions = {}
  ): Promise<CustomRole> {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Generate slug from role name
    const roleSlug = generateRoleSlug(roleName)

    if (!isValidRoleSlug(roleSlug)) {
      throw new Error('Invalid role name: must contain only letters, numbers, hyphens, and underscores')
    }

    // Validate color if provided
    const color = options.color || '#6B7280'
    if (!isValidColorHex(color)) {
      throw new Error('Invalid color: must be a valid hex color (e.g., #FF5733)')
    }

    // Check if slug already exists for this company
    const existing = await this.getCustomRoleBySlug(companyId, roleSlug)
    if (existing) {
      throw new Error(`A role with the name "${roleName}" already exists`)
    }

    const { data, error } = await supabase
      .from('custom_roles')
      .insert({
        company_id: companyId,
        role_name: roleName,
        role_slug: roleSlug,
        description: options.description || null,
        color,
        icon: options.icon || '👤',
        permissions,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom role:', error)
      throw new Error(`Failed to create custom role: ${error.message}`)
    }

    return data as CustomRole
  },

  /**
   * Update an existing custom role
   */
  async updateCustomRole(
    roleId: string,
    updates: {
      role_name?: string
      description?: string
      color?: string
      icon?: string
      permissions?: PermissionSet
    }
  ): Promise<CustomRole> {
    const supabase = createClient()

    // Validate color if updating
    if (updates.color && !isValidColorHex(updates.color)) {
      throw new Error('Invalid color: must be a valid hex color (e.g., #FF5733)')
    }

    // If updating role name, regenerate slug
    let updateData: any = { ...updates, updated_at: new Date().toISOString() }

    if (updates.role_name) {
      const newSlug = generateRoleSlug(updates.role_name)
      if (!isValidRoleSlug(newSlug)) {
        throw new Error('Invalid role name: must contain only letters, numbers, hyphens, and underscores')
      }
      updateData.role_slug = newSlug
    }

    const { data, error } = await supabase
      .from('custom_roles')
      .update(updateData)
      .eq('id', roleId)
      .eq('is_active', true)
      .select()
      .single()

    if (error) {
      console.error('Error updating custom role:', error)
      throw new Error(`Failed to update custom role: ${error.message}`)
    }

    return data as CustomRole
  },

  /**
   * Soft delete a custom role
   * Sets is_active = false instead of deleting the record
   * Team members with this role will have custom_role_id set to NULL via FK constraint
   */
  async deleteCustomRole(roleId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('custom_roles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)

    if (error) {
      console.error('Error deleting custom role:', error)
      throw new Error(`Failed to delete custom role: ${error.message}`)
    }
  },

  /**
   * Check if a custom role is in use by any team members
   */
  async isRoleInUse(roleId: string): Promise<boolean> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('team_members')
      .select('id')
      .eq('custom_role_id', roleId)
      .is('removed_at', null)
      .limit(1)

    if (error) {
      console.error('Error checking role usage:', error)
      return false
    }

    return (data?.length || 0) > 0
  },

  /**
   * Get team members count for a custom role
   */
  async getRoleMemberCount(roleId: string): Promise<number> {
    const supabase = createClient()

    const { count, error } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('custom_role_id', roleId)
      .is('removed_at', null)

    if (error) {
      console.error('Error getting role member count:', error)
      return 0
    }

    return count || 0
  },

  /**
   * Clone an existing custom role
   */
  async cloneCustomRole(
    roleId: string,
    newRoleName: string,
    companyId: string
  ): Promise<CustomRole> {
    const supabase = createClient()

    // Get the original role
    const originalRole = await this.getCustomRole(roleId)
    if (!originalRole) {
      throw new Error('Original role not found')
    }

    // Create new role with same permissions
    return this.createCustomRole(
      companyId,
      newRoleName,
      originalRole.permissions,
      {
        description: originalRole.description || undefined,
        color: originalRole.color,
        icon: originalRole.icon
      }
    )
  }
}
