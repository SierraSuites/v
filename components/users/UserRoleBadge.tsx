"use client"

import { useState, useEffect } from 'react'
import { permissionService, type UserRole } from '@/lib/permissions'

interface UserRoleBadgeProps {
  userId?: string
  role?: UserRole // If role is already known
  projectId?: string // Show role for specific project
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function UserRoleBadge({
  userId,
  role: providedRole,
  projectId,
  showIcon = true,
  size = 'md'
}: UserRoleBadgeProps) {
  const [role, setRole] = useState<UserRole>(providedRole || 'viewer')
  const [loading, setLoading] = useState(!providedRole)

  useEffect(() => {
    if (!providedRole && userId) {
      loadRole()
    }
  }, [userId, projectId, providedRole])

  const loadRole = async () => {
    try {
      setLoading(true)
      const userRole = projectId
        ? await permissionService.getUserProjectRole(projectId, userId)
        : await permissionService.getUserHighestRole(userId)
      setRole(userRole)
    } catch (error) {
      console.error('Error loading user role:', error)
      setRole('viewer')
    } finally {
      setLoading(false)
    }
  }

  const roleConfig = {
    admin: {
      label: 'Admin',
      icon: '👑',
      bgColor: '#F3E8FF',
      textColor: '#7C3AED',
      borderColor: '#C4B5FD'
    },
    superintendent: {
      label: 'Superintendent',
      icon: '🔧',
      bgColor: '#DBEAFE',
      textColor: '#1E40AF',
      borderColor: '#BFDBFE'
    },
    project_manager: {
      label: 'Project Manager',
      icon: '📋',
      bgColor: '#D1FAE5',
      textColor: '#047857',
      borderColor: '#A7F3D0'
    },
    field_engineer: {
      label: 'Field Engineer',
      icon: '🏗️',
      bgColor: '#FED7AA',
      textColor: '#C2410C',
      borderColor: '#FDBA74'
    },
    accountant: {
      label: 'Accountant',
      icon: '💰',
      bgColor: '#FEF3C7',
      textColor: '#92400E',
      borderColor: '#FDE68A'
    },
    subcontractor: {
      label: 'Subcontractor',
      icon: '🔨',
      bgColor: '#E0E7FF',
      textColor: '#3730A3',
      borderColor: '#C7D2FE'
    },
    viewer: {
      label: 'Viewer',
      icon: '👁️',
      bgColor: '#F3F4F6',
      textColor: '#4B5563',
      borderColor: '#E5E7EB'
    }
  } satisfies Record<UserRole, { label: string; icon: string; bgColor: string; textColor: string; borderColor: string }>

  const config = roleConfig[role]

  const sizeStyles = {
    sm: {
      padding: 'px-2 py-0.5',
      fontSize: 'text-xs',
      iconSize: 'text-xs'
    },
    md: {
      padding: 'px-3 py-1',
      fontSize: 'text-sm',
      iconSize: 'text-sm'
    },
    lg: {
      padding: 'px-4 py-1.5',
      fontSize: 'text-base',
      iconSize: 'text-base'
    }
  }

  const styles = sizeStyles[size]

  if (loading) {
    return (
      <div
        className={`${styles.padding} ${styles.fontSize} rounded-full inline-flex items-center gap-1 animate-pulse`}
        style={{ backgroundColor: '#F3F4F6' }}
      >
        <div className="w-12 h-3 rounded" style={{ backgroundColor: '#E5E7EB' }} />
      </div>
    )
  }

  return (
    <span
      className={`${styles.padding} ${styles.fontSize} rounded-full font-semibold inline-flex items-center gap-1.5 border`}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        borderColor: config.borderColor
      }}
    >
      {showIcon && <span className={styles.iconSize}>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  )
}

/**
 * Simple role indicator without async loading
 */
export function RoleBadge({ role, size = 'md', showIcon = true }: { role: UserRole, size?: 'sm' | 'md' | 'lg', showIcon?: boolean }) {
  return <UserRoleBadge role={role} size={size} showIcon={showIcon} />
}
