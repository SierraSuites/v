import { useState, useEffect } from 'react'
import { permissionService, PermissionSet, UserRole } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to check if current user has a specific permission
 * @param permission - The permission to check
 * @param projectId - Optional project ID for project-scoped permissions
 * @returns Object with permission status and loading state
 */
export function usePermission(
  permission: keyof PermissionSet,
  projectId?: string
) {
  const [hasPermission, setHasPermission] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkPermission() {
      try {
        setLoading(true)
        setError(null)

        const result = await permissionService.hasPermission(permission, projectId)

        if (!cancelled) {
          setHasPermission(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to check permission')
          setHasPermission(false)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    checkPermission()

    return () => {
      cancelled = true
    }
  }, [permission, projectId])

  return { hasPermission, loading, error }
}

/**
 * Hook to get multiple permissions at once
 * More efficient than calling usePermission multiple times
 */
export function usePermissions(
  permissions: (keyof PermissionSet)[],
  projectId?: string
) {
  const [permissionMap, setPermissionMap] = useState<Record<keyof PermissionSet, boolean>>({} as any)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkPermissions() {
      try {
        setLoading(true)
        setError(null)

        const results = await permissionService.hasPermissions(permissions, projectId)

        if (!cancelled) {
          setPermissionMap(results)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to check permissions')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    checkPermissions()

    return () => {
      cancelled = true
    }
  }, [permissions.join(','), projectId])

  return { permissions: permissionMap, loading, error }
}

/**
 * Hook to get current user's highest role
 */
export function useUserRole() {
  const [role, setRole] = useState<UserRole>('viewer')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchRole() {
      try {
        setLoading(true)
        setError(null)

        const userRole = await permissionService.getUserHighestRole()

        if (!cancelled) {
          setRole(userRole)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to get user role')
          setRole('viewer')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchRole()

    return () => {
      cancelled = true
    }
  }, [])

  return { role, loading, error }
}

/**
 * Hook to get user's merged permissions from all assigned roles
 */
export function useMergedPermissions() {
  const [permissions, setPermissions] = useState<PermissionSet | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchPermissions() {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('No authenticated user')
        }

        // Get user's company
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (!profile?.company_id) {
          throw new Error('User has no company')
        }

        const mergedPerms = await permissionService.getMergedPermissions(user.id, profile.company_id)

        if (!cancelled) {
          setPermissions(mergedPerms)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to get permissions')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchPermissions()

    return () => {
      cancelled = true
    }
  }, [])

  return { permissions, loading, error }
}

/**
 * Hook to get user's role assignments
 */
export function useRoleAssignments(userId?: string) {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAssignments() {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        // Get target user ID
        let targetUserId = userId
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('No authenticated user')
          targetUserId = user.id
        }

        // Get user's company
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', targetUserId)
          .single()

        if (!profile?.company_id) {
          throw new Error('User has no company')
        }

        const roleAssignments = await permissionService.getUserRoleAssignments(
          targetUserId,
          profile.company_id
        )

        if (!cancelled) {
          setAssignments(roleAssignments)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to get role assignments')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchAssignments()

    return () => {
      cancelled = true
    }
  }, [userId])

  return { assignments, loading, error, refetch: () => setLoading(true) }
}

/**
 * Hook to check if user can manage another user based on role hierarchy
 */
export function useCanManageUser(targetUserId: string) {
  const [canManage, setCanManage] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false

    async function checkManagement() {
      try {
        setLoading(true)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setCanManage(false)
          return
        }

        // Can't manage yourself
        if (user.id === targetUserId) {
          setCanManage(false)
          return
        }

        // Get both users' highest roles
        const [currentUserRole, targetUserRole] = await Promise.all([
          permissionService.getUserHighestRole(user.id),
          permissionService.getUserHighestRole(targetUserId)
        ])

        // Check if current user's role can manage target user's role
        const { canManageRole } = await import('@/lib/permissions')
        const result = canManageRole(currentUserRole, targetUserRole)

        if (!cancelled) {
          setCanManage(result)
        }
      } catch (err) {
        if (!cancelled) {
          setCanManage(false)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    checkManagement()

    return () => {
      cancelled = true
    }
  }, [targetUserId])

  return { canManage, loading }
}

/**
 * Hook for real-time permission updates
 * Subscribes to changes in user_role_assignments table
 */
export function useRealtimePermissions() {
  const [permissions, setPermissions] = useState<PermissionSet | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const supabase = createClient()
    let channel: any = null

    async function setupRealtimeSubscription() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get user's company
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (!profile?.company_id) return

        // Initial load
        const mergedPerms = await permissionService.getMergedPermissions(user.id, profile.company_id)
        setPermissions(mergedPerms)
        setLoading(false)

        // Subscribe to changes
        channel = supabase
          .channel('user_role_assignments_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_role_assignments',
              filter: `user_id=eq.${user.id}`
            },
            async () => {
              // Refetch permissions when assignments change
              const updatedPerms = await permissionService.getMergedPermissions(user.id, profile.company_id)
              setPermissions(updatedPerms)
            }
          )
          .subscribe()
      } catch (err) {
        console.error('Error setting up realtime permissions:', err)
        setLoading(false)
      }
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return { permissions, loading }
}
