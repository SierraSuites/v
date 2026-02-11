"use client"

import { usePermissions } from '@/hooks/usePermissions'
import type { UserRole } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'

const roleColors: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: '#DC2626', text: '#FFFFFF' },
  superintendent: { bg: '#EA580C', text: '#FFFFFF' },
  project_manager: { bg: '#D97706', text: '#FFFFFF' },
  accountant: { bg: '#B45309', text: '#FFFFFF' },
  field_engineer: { bg: '#059669', text: '#FFFFFF' },
  subcontractor: { bg: '#4338CA', text: '#FFFFFF' },
  viewer: { bg: '#6B7280', text: '#FFFFFF' },
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  superintendent: 'Superintendent',
  project_manager: 'Project Manager',
  accountant: 'Accountant',
  field_engineer: 'Field Engineer',
  subcontractor: 'Subcontractor',
  viewer: 'Viewer',
}

interface PermissionBadgeProps {
  projectId?: string
  showIcon?: boolean
  className?: string
}

/**
 * Badge that displays the user's current role
 */
export function PermissionBadge({
  projectId,
  showIcon = false,
  className = '',
}: PermissionBadgeProps) {
  const { role, loading } = usePermissions(projectId)

  if (loading) {
    return (
      <Badge variant="outline" className={className}>
        Loading...
      </Badge>
    )
  }

  const colors = roleColors[role]
  const label = roleLabels[role]

  return (
    <Badge
      className={className}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: 'none',
      }}
    >
      {showIcon && <span className="mr-1">👤</span>}
      {label}
    </Badge>
  )
}

/**
 * Badge that shows permission status for a specific permission
 */
export function PermissionStatusBadge({
  permission,
  projectId,
  grantedText = 'Granted',
  deniedText = 'Denied',
  className = '',
}: {
  permission: string
  projectId?: string
  grantedText?: string
  deniedText?: string
  className?: string
}) {
  const { hasPermission, loading } = usePermissions(projectId)

  if (loading) {
    return (
      <Badge variant="outline" className={className}>
        ...
      </Badge>
    )
  }

  const hasAccess = hasPermission(permission as any)

  return (
    <Badge
      variant={hasAccess ? 'default' : 'destructive'}
      className={className}
    >
      {hasAccess ? grantedText : deniedText}
    </Badge>
  )
}
