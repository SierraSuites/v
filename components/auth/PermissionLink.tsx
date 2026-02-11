"use client"

import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionSet } from '@/lib/permissions'
import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'

interface PermissionLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  permission: keyof PermissionSet | (keyof PermissionSet)[]
  requireAll?: boolean
  projectId?: string
  hideWhenDenied?: boolean
}

/**
 * Link that is automatically hidden or disabled when user lacks permission
 */
export function PermissionLink({
  permission,
  requireAll = false,
  projectId,
  hideWhenDenied = false,
  children,
  className = '',
  ...props
}: PermissionLinkProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions(projectId)

  // Check permission
  let hasAccess = false
  if (!loading) {
    if (typeof permission === 'string') {
      hasAccess = hasPermission(permission)
    } else {
      hasAccess = requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission)
    }
  }

  // Hide if configured to do so
  if (hideWhenDenied && !hasAccess && !loading) {
    return null
  }

  // Disable link styling if no access
  if (!hasAccess && !loading) {
    return (
      <span
        className={`${className} opacity-50 cursor-not-allowed`}
        title="You do not have permission to access this"
      >
        {children}
      </span>
    )
  }

  return (
    <Link className={className} {...props}>
      {children}
    </Link>
  )
}
