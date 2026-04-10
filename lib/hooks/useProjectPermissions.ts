'use client'

/**
 * useProjectPermissions
 *
 * Returns the permission set for the current user within a specific project.
 * Pass the values from ProjectDetails (currentUserRole, currentUserCompanyRole).
 *
 * Company owner/admin receive full access regardless of project role.
 * Falls back to viewer permissions if the role is unknown.
 *
 * Usage:
 *   const perms = useProjectPermissions(project.currentUserRole, project.currentUserCompanyRole)
 *   if (perms.manageBudget) { ... }
 */

import { useMemo } from 'react'
import { getProjectPermissions, PROJECT_ROLE_PERMISSIONS, type ProjectPermissionSet } from '@/lib/permissions'

export function useProjectPermissions(
  projectRole: string | null | undefined,
  companyRole: string | null | undefined
): ProjectPermissionSet {
  return useMemo(() => {
    // Company owner/admin get full access to every project
    if (companyRole === 'owner' || companyRole === 'admin') {
      return PROJECT_ROLE_PERMISSIONS.owner
    }
    return getProjectPermissions(projectRole)
  }, [projectRole, companyRole])
}
