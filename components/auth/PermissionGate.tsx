"use client"

import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionSet } from '@/lib/permissions'

interface PermissionGateProps {
  permission: keyof PermissionSet | (keyof PermissionSet)[]
  requireAll?: boolean // If true, requires all permissions. If false (default), requires any permission
  projectId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Gate component that shows/hides content based on permissions
 */
export default function PermissionGate({
  permission,
  requireAll = false,
  projectId,
  fallback = null,
  children
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions(projectId)

  if (loading) {
    return <>{fallback}</>
  }

  // Handle single permission
  if (typeof permission === 'string') {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
  }

  // Handle multiple permissions
  const hasAccess = requireAll
    ? hasAllPermissions(permission)
    : hasAnyPermission(permission)

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * Component that shows content when user LACKS permission (opposite of PermissionGate)
 */
export function PermissionDenied({
  permission,
  projectId,
  children
}: {
  permission: keyof PermissionSet | (keyof PermissionSet)[]
  projectId?: string
  children: React.ReactNode
}) {
  const { hasPermission, hasAnyPermission, loading } = usePermissions(projectId)

  if (loading) {
    return null
  }

  // Handle single permission
  if (typeof permission === 'string') {
    return !hasPermission(permission) ? <>{children}</> : null
  }

  // Handle multiple permissions - show if user lacks ALL of them
  const lacksAccess = !hasAnyPermission(permission)

  return lacksAccess ? <>{children}</> : null
}

/**
 * Show unauthorized message
 */
export function UnauthorizedAccess({
  message = 'You do not have permission to access this content',
  actionText,
  onAction
}: {
  message?: string
  actionText?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <span className="text-4xl">🔒</span>
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
          Access Restricted
        </h3>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
          {message}
        </p>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="px-6 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#FF6B6B' }}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  )
}
