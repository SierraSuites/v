"use client"

import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionSet } from '@/lib/permissions'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { ComponentPropsWithoutRef } from 'react'

interface PermissionMenuItemProps extends ComponentPropsWithoutRef<typeof DropdownMenuItem> {
  permission: keyof PermissionSet | (keyof PermissionSet)[]
  requireAll?: boolean
  projectId?: string
  hideWhenDenied?: boolean
}

/**
 * Dropdown menu item that is automatically disabled or hidden when user lacks permission
 */
export function PermissionMenuItem({
  permission,
  requireAll = false,
  projectId,
  hideWhenDenied = false,
  disabled,
  children,
  ...props
}: PermissionMenuItemProps) {
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

  const isDisabled = disabled || loading || !hasAccess

  return (
    <DropdownMenuItem disabled={isDisabled} {...props}>
      {children}
    </DropdownMenuItem>
  )
}
