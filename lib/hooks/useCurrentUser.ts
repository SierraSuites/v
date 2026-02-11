import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole, PermissionSet, permissionService } from '@/lib/permissions'

export interface CurrentUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  job_title: string | null
  department: string | null
  company_id: string | null
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  // Extended with role information
  highestRole: UserRole
  roleAssignments: any[]
  permissions: PermissionSet
}

/**
 * Hook to get current authenticated user with their roles and permissions
 * This is the primary hook for user information in the app
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCurrentUser() {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          if (!cancelled) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError || !profile) {
          throw new Error('Failed to load user profile')
        }

        if (!profile.company_id) {
          throw new Error('User is not associated with a company')
        }

        // Get highest role
        const highestRole = await permissionService.getUserHighestRole(authUser.id)

        // Get role assignments
        const roleAssignments = await permissionService.getUserRoleAssignments(
          authUser.id,
          profile.company_id
        )

        // Get merged permissions
        const permissions = await permissionService.getMergedPermissions(
          authUser.id,
          profile.company_id
        )

        if (!cancelled) {
          setUser({
            id: authUser.id,
            email: authUser.email!,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            phone: profile.phone,
            job_title: profile.job_title,
            department: profile.department,
            company_id: profile.company_id,
            is_active: profile.is_active ?? true,
            created_at: profile.created_at,
            last_sign_in_at: authUser.last_sign_in_at ?? null,
            highestRole,
            roleAssignments,
            permissions
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load user')
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchCurrentUser()

    // Subscribe to auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchCurrentUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error, refetch: () => setLoading(true) }
}

/**
 * Hook to check if current user has a specific permission
 * Simpler alternative to usePermission when you have CurrentUser context
 */
export function useHasPermission(permission: keyof PermissionSet) {
  const { user, loading } = useCurrentUser()

  return {
    hasPermission: user?.permissions[permission] ?? false,
    loading
  }
}

/**
 * Hook to get current user's company information
 */
export function useCurrentCompany() {
  const [company, setCompany] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    let cancelled = false

    async function fetchCompany() {
      if (!currentUser?.company_id) {
        setCompany(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { data, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', currentUser.company_id)
          .single()

        if (companyError) throw companyError

        if (!cancelled) {
          setCompany(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load company')
          setCompany(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchCompany()

    return () => {
      cancelled = true
    }
  }, [currentUser?.company_id])

  return { company, loading, error }
}

/**
 * Hook to check if current user is an admin
 * Convenience hook for common permission check
 */
export function useIsAdmin() {
  const { user, loading } = useCurrentUser()

  return {
    isAdmin: user?.highestRole === 'admin',
    loading
  }
}

/**
 * Hook to check if current user can perform an action
 * More semantic than checking permissions directly
 */
export function useCanPerformAction(action: keyof PermissionSet) {
  const { user, loading } = useCurrentUser()

  return {
    canPerform: user?.permissions[action] ?? false,
    loading,
    role: user?.highestRole
  }
}

/**
 * Hook for real-time user updates
 * Subscribes to changes in profiles and role assignments
 */
export function useRealtimeUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const supabase = createClient()
    let profileChannel: any = null
    let rolesChannel: any = null

    async function setupRealtimeSubscription() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        // Initial load
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!profile?.company_id) return

        const highestRole = await permissionService.getUserHighestRole(authUser.id)
        const roleAssignments = await permissionService.getUserRoleAssignments(authUser.id, profile.company_id)
        const permissions = await permissionService.getMergedPermissions(authUser.id, profile.company_id)

        setUser({
          id: authUser.id,
          email: authUser.email!,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          job_title: profile.job_title,
          department: profile.department,
          company_id: profile.company_id,
          is_active: profile.is_active ?? true,
          created_at: profile.created_at,
          last_sign_in_at: authUser.last_sign_in_at ?? null,
          highestRole,
          roleAssignments,
          permissions
        })
        setLoading(false)

        // Subscribe to profile changes
        profileChannel = supabase
          .channel('profile_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${authUser.id}`
            },
            async () => {
              // Refetch user data
              const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single()

              if (updatedProfile?.company_id) {
                const updatedRole = await permissionService.getUserHighestRole(authUser.id)
                const updatedAssignments = await permissionService.getUserRoleAssignments(authUser.id, updatedProfile.company_id)
                const updatedPermissions = await permissionService.getMergedPermissions(authUser.id, updatedProfile.company_id)

                setUser({
                  id: authUser.id,
                  email: authUser.email!,
                  full_name: updatedProfile.full_name,
                  avatar_url: updatedProfile.avatar_url,
                  phone: updatedProfile.phone,
                  job_title: updatedProfile.job_title,
                  department: updatedProfile.department,
                  company_id: updatedProfile.company_id,
                  is_active: updatedProfile.is_active ?? true,
                  created_at: updatedProfile.created_at,
                  last_sign_in_at: authUser.last_sign_in_at ?? null,
                  highestRole: updatedRole,
                  roleAssignments: updatedAssignments,
                  permissions: updatedPermissions
                })
              }
            }
          )
          .subscribe()

        // Subscribe to role assignment changes
        rolesChannel = supabase
          .channel('role_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_role_assignments',
              filter: `user_id=eq.${authUser.id}`
            },
            async () => {
              // Refetch roles and permissions
              if (profile.company_id) {
                const updatedRole = await permissionService.getUserHighestRole(authUser.id)
                const updatedAssignments = await permissionService.getUserRoleAssignments(authUser.id, profile.company_id)
                const updatedPermissions = await permissionService.getMergedPermissions(authUser.id, profile.company_id)

                setUser(prev => prev ? {
                  ...prev,
                  highestRole: updatedRole,
                  roleAssignments: updatedAssignments,
                  permissions: updatedPermissions
                } : null)
              }
            }
          )
          .subscribe()
      } catch (err) {
        console.error('Error setting up realtime user subscription:', err)
        setLoading(false)
      }
    }

    setupRealtimeSubscription()

    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel)
      if (rolesChannel) supabase.removeChannel(rolesChannel)
    }
  }, [])

  return { user, loading }
}
