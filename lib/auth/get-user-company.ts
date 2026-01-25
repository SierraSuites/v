/**
 * Get User Company Helper
 *
 * SINGLE SOURCE OF TRUTH for company_id
 *
 * CRITICAL: Always use this function instead of:
 * - user.user_metadata.company_id (WRONG)
 * - Direct database queries (INCONSISTENT)
 *
 * This ensures:
 * - Consistent company_id across app
 * - Security (RLS policies work correctly)
 * - Easy to update if architecture changes
 */

import { createClient } from '@/lib/supabase/client'

export interface UserCompanyProfile {
  id: string
  company_id: string
  role: 'owner' | 'admin' | 'project_manager' | 'member' | 'viewer'
  subscription_tier: 'starter' | 'professional' | 'enterprise'
  full_name: string | null
  email: string
  avatar_url: string | null
}

/**
 * Get the current user's company profile
 *
 * This is the ONLY way to get company_id in the app
 *
 * Usage:
 * const profile = await getUserCompany()
 * if (!profile) return redirect('/login')
 *
 * const companyId = profile.company_id
 * const userRole = profile.role
 */
export async function getUserCompany(): Promise<UserCompanyProfile | null> {
  const supabase = createClient()

  // Get current authenticated user
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('Failed to get authenticated user:', authError)
    return null
  }

  // IMPORTANT: Get company_id from profiles table (source of truth)
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, company_id, role, subscription_tier, full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Failed to get user profile:', profileError)
    return null
  }

  return profile as UserCompanyProfile
}

/**
 * Get just the company_id (shorthand)
 *
 * Usage:
 * const companyId = await getCompanyId()
 * if (!companyId) return redirect('/login')
 */
export async function getCompanyId(): Promise<string | null> {
  const profile = await getUserCompany()
  return profile?.company_id ?? null
}

/**
 * Check if current user is admin or owner
 *
 * Usage:
 * const isAdmin = await isCompanyAdmin()
 * if (!isAdmin) return redirect('/unauthorized')
 */
export async function isCompanyAdmin(): Promise<boolean> {
  const profile = await getUserCompany()
  return profile?.role === 'owner' || profile?.role === 'admin'
}

/**
 * Check if user has specific permission
 *
 * Usage:
 * const canManageProjects = await hasPermission('can_manage_projects')
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const profile = await getUserCompany()
  if (!profile) return false

  const supabase = createClient()

  // Use the database function we created
  const { data } = await supabase.rpc('user_has_permission', {
    user_uuid: profile.id,
    permission_name: permission
  })

  return data ?? false
}

/**
 * Get company details
 *
 * Usage:
 * const company = await getCompanyDetails()
 * console.log(company.name)
 */
export async function getCompanyDetails() {
  const companyId = await getCompanyId()
  if (!companyId) return null

  const supabase = createClient()

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (error) {
    console.error('Failed to get company details:', error)
    return null
  }

  return company
}

/**
 * Get all users in current user's company
 *
 * Usage:
 * const teamMembers = await getCompanyMembers()
 */
export async function getCompanyMembers() {
  const companyId = await getCompanyId()
  if (!companyId) return []

  const supabase = createClient()

  const { data: members, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, avatar_url, role, last_seen_at')
    .eq('company_id', companyId)
    .order('full_name')

  if (error) {
    console.error('Failed to get company members:', error)
    return []
  }

  return members ?? []
}

/**
 * Check if user belongs to specific company
 *
 * Usage:
 * const canAccess = await belongsToCompany(projectCompanyId)
 */
export async function belongsToCompany(checkCompanyId: string): Promise<boolean> {
  const companyId = await getCompanyId()
  return companyId === checkCompanyId
}

/**
 * Require authentication (throws if not authenticated)
 *
 * Usage in Server Components:
 * const profile = await requireAuth()
 * // If we get here, user is authenticated
 */
export async function requireAuth(): Promise<UserCompanyProfile> {
  const profile = await getUserCompany()

  if (!profile) {
    throw new Error('Authentication required')
  }

  return profile
}

/**
 * Require admin role (throws if not admin)
 *
 * Usage in Server Components:
 * await requireAdmin()
 * // If we get here, user is admin
 */
export async function requireAdmin(): Promise<UserCompanyProfile> {
  const profile = await requireAuth()

  if (profile.role !== 'owner' && profile.role !== 'admin') {
    throw new Error('Admin access required')
  }

  return profile
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Find all files using deprecated company_id access
 *
 * Run this command to find files that need updating:
 *
 * grep -r "user_metadata.company_id" app/
 * grep -r "user_metadata.company_id" components/
 * grep -r "user_metadata.company_id" lib/
 *
 * Replace with:
 * const { company_id } = await getUserCompany()
 */

/**
 * Example migrations:
 *
 * BEFORE:
 * const companyId = user?.user_metadata?.company_id
 * const { data } = await supabase
 *   .from('projects')
 *   .select('*')
 *   .eq('company_id', companyId)
 *
 * AFTER:
 * const { company_id } = await getUserCompany()
 * if (!company_id) return redirect('/login')
 *
 * const { data } = await supabase
 *   .from('projects')
 *   .select('*')
 *   .eq('company_id', company_id)
 */
