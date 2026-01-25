"use client"

import { useState, useEffect } from 'react'
import { permissionService, type PermissionSet, type UserRole } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

export function usePermissions(projectId?: string) {
  const [permissions, setPermissions] = useState<PermissionSet | null>(null)
  const [role, setRole] = useState<UserRole>('viewer')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadPermissions()
  }, [projectId])

  const loadPermissions = async () => {
    try {
      setLoading(true)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setPermissions(permissionService.getPermissionsForRole('viewer'))
        setRole('viewer')
        return
      }

      setUserId(user.id)

      // Get role based on context
      const userRole = projectId
        ? await permissionService.getUserProjectRole(projectId)
        : await permissionService.getUserHighestRole()

      setRole(userRole)
      setPermissions(permissionService.getPermissionsForRole(userRole))
    } catch (error) {
      console.error('Error loading permissions:', error)
      setPermissions(permissionService.getPermissionsForRole('viewer'))
      setRole('viewer')
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (permission: keyof PermissionSet): boolean => {
    if (!permissions) return false
    return permissions[permission]
  }

  const hasAnyPermission = (permissionList: (keyof PermissionSet)[]): boolean => {
    if (!permissions) return false
    return permissionList.some(permission => permissions[permission])
  }

  const hasAllPermissions = (permissionList: (keyof PermissionSet)[]): boolean => {
    if (!permissions) return false
    return permissionList.every(permission => permissions[permission])
  }

  return {
    permissions,
    role,
    userId,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh: loadPermissions
  }
}

export function useAccessibleProjects() {
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAccessibleProjects()
  }, [])

  const loadAccessibleProjects = async () => {
    try {
      setLoading(true)
      const projects = await permissionService.getUserAccessibleProjects()
      setProjectIds(projects)
    } catch (error) {
      console.error('Error loading accessible projects:', error)
      setProjectIds([])
    } finally {
      setLoading(false)
    }
  }

  return {
    projectIds,
    loading,
    refresh: loadAccessibleProjects,
    hasAccess: (projectId: string) => projectIds.includes(projectId)
  }
}
