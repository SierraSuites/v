"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from './usePermissions'
import type { PermissionSet } from '@/lib/permissions'

interface UsePermissionGuardOptions {
  permission: keyof PermissionSet | (keyof PermissionSet)[]
  requireAll?: boolean
  projectId?: string
  redirectTo?: string
  onDenied?: () => void
}

/**
 * Hook to guard entire pages with permission checks
 * Redirects or calls callback when permission is denied
 */
export function usePermissionGuard({
  permission,
  requireAll = false,
  projectId,
  redirectTo = '/unauthorized',
  onDenied,
}: UsePermissionGuardOptions) {
  const router = useRouter()
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions(projectId)

  useEffect(() => {
    if (loading) return

    let hasAccess = false
    if (typeof permission === 'string') {
      hasAccess = hasPermission(permission)
    } else {
      hasAccess = requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission)
    }

    if (!hasAccess) {
      if (onDenied) {
        onDenied()
      } else if (redirectTo) {
        router.push(redirectTo)
      }
    }
  }, [
    permission,
    requireAll,
    projectId,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    redirectTo,
    onDenied,
    router,
  ])

  return { loading }
}

/**
 * Hook to check if user can perform an action, with toast notification on denial
 */
export function usePermissionCheck(projectId?: string) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions(projectId)

  const checkPermission = (
    permission: keyof PermissionSet | (keyof PermissionSet)[],
    options?: {
      requireAll?: boolean
      onDenied?: (message: string) => void
      deniedMessage?: string
    }
  ): boolean => {
    const { requireAll = false, onDenied, deniedMessage = 'You do not have permission to perform this action' } = options || {}

    let hasAccess = false
    if (typeof permission === 'string') {
      hasAccess = hasPermission(permission)
    } else {
      hasAccess = requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission)
    }

    if (!hasAccess && onDenied) {
      onDenied(deniedMessage)
    }

    return hasAccess
  }

  return { checkPermission }
}
