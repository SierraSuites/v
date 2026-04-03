import { describe, it, expect } from 'vitest'
import {
  ROLE_PERMISSIONS,
  permissionService,
  getRoleDisplayName,
  getRoleColor,
  getRoleLevel,
  canManageRole,
} from '@/lib/permissions'

const { compareRolePermissions } = permissionService
import type { UserRole } from '@/lib/permissions'

// ─── ROLE PERMISSIONS MATRIX ────────────────────────────────────────────────

describe('ROLE_PERMISSIONS', () => {
  const allRoles: UserRole[] = [
    'admin', 'superintendent', 'project_manager',
    'field_engineer', 'viewer', 'accountant', 'subcontractor',
  ]

  it('has a permission set defined for every role', () => {
    for (const role of allRoles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined()
    }
  })

  it('admin has all permissions set to true', () => {
    const perms = ROLE_PERMISSIONS.admin
    for (const key of Object.keys(perms) as (keyof typeof perms)[]) {
      expect(perms[key]).toBe(true)
    }
  })

  it('viewer has no write permissions', () => {
    const perms = ROLE_PERMISSIONS.viewer
    expect(perms.canCreateProjects).toBe(false)
    expect(perms.canEditProjects).toBe(false)
    expect(perms.canDeleteProjects).toBe(false)
    expect(perms.canManageTeam).toBe(false)
    expect(perms.canUploadPhotos).toBe(false)
    expect(perms.canManageFinances).toBe(false)
  })

  it('viewer can view punch list', () => {
    expect(ROLE_PERMISSIONS.viewer.canViewPunchList).toBe(true)
  })

  it('accountant has full financial access', () => {
    const perms = ROLE_PERMISSIONS.accountant
    expect(perms.canManageFinances).toBe(true)
    expect(perms.canApproveExpenses).toBe(true)
    expect(perms.canViewFinancials).toBe(true)
  })

  it('accountant cannot manage team or settings', () => {
    const perms = ROLE_PERMISSIONS.accountant
    expect(perms.canManageTeam).toBe(false)
    expect(perms.canManageCompanySettings).toBe(false)
    expect(perms.canManageIntegrations).toBe(false)
  })

  it('subcontractor can upload photos and resolve punch items', () => {
    const perms = ROLE_PERMISSIONS.subcontractor
    expect(perms.canUploadPhotos).toBe(true)
    expect(perms.canResolvePunchItems).toBe(true)
  })

  it('subcontractor cannot view financials or manage team', () => {
    const perms = ROLE_PERMISSIONS.subcontractor
    expect(perms.canViewFinancials).toBe(false)
    expect(perms.canManageTeam).toBe(false)
  })

  it('superintendent cannot change roles or manage company settings', () => {
    const perms = ROLE_PERMISSIONS.superintendent
    expect(perms.canChangeRoles).toBe(false)
    expect(perms.canManageCompanySettings).toBe(false)
  })

  it('project_manager cannot manage finances or delete projects', () => {
    const perms = ROLE_PERMISSIONS.project_manager
    expect(perms.canManageFinances).toBe(false)
    expect(perms.canDeleteProjects).toBe(false)
  })

  it('field_engineer cannot view analytics or financials', () => {
    const perms = ROLE_PERMISSIONS.field_engineer
    expect(perms.canViewAnalytics).toBe(false)
    expect(perms.canViewFinancials).toBe(false)
  })
})

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────────────

describe('getRoleDisplayName', () => {
  it('returns correct display names', () => {
    expect(getRoleDisplayName('admin')).toBe('Administrator')
    expect(getRoleDisplayName('superintendent')).toBe('Superintendent')
    expect(getRoleDisplayName('project_manager')).toBe('Project Manager')
    expect(getRoleDisplayName('field_engineer')).toBe('Field Engineer')
    expect(getRoleDisplayName('viewer')).toBe('Viewer')
    expect(getRoleDisplayName('accountant')).toBe('Accountant')
    expect(getRoleDisplayName('subcontractor')).toBe('Subcontractor')
  })
})

describe('getRoleColor', () => {
  it('returns a hex color string for every role', () => {
    const roles: UserRole[] = [
      'admin', 'superintendent', 'project_manager',
      'field_engineer', 'viewer', 'accountant', 'subcontractor',
    ]
    for (const role of roles) {
      expect(getRoleColor(role)).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

// ─── ROLE HIERARCHY ──────────────────────────────────────────────────────────

describe('getRoleLevel', () => {
  it('admin is the highest level', () => {
    expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('superintendent'))
    expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('project_manager'))
    expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('viewer'))
  })

  it('viewer is the lowest level', () => {
    const roles: UserRole[] = [
      'admin', 'superintendent', 'project_manager',
      'field_engineer', 'accountant', 'subcontractor',
    ]
    for (const role of roles) {
      expect(getRoleLevel('viewer')).toBeLessThan(getRoleLevel(role))
    }
  })

  it('returns a number for every role', () => {
    const roles: UserRole[] = [
      'admin', 'superintendent', 'project_manager',
      'field_engineer', 'viewer', 'accountant', 'subcontractor',
    ]
    for (const role of roles) {
      expect(typeof getRoleLevel(role)).toBe('number')
    }
  })
})

describe('canManageRole', () => {
  it('admin can manage all other roles', () => {
    const roles: UserRole[] = [
      'superintendent', 'project_manager', 'field_engineer',
      'viewer', 'accountant', 'subcontractor',
    ]
    for (const role of roles) {
      expect(canManageRole('admin', role)).toBe(true)
    }
  })

  it('viewer cannot manage any role', () => {
    const roles: UserRole[] = [
      'admin', 'superintendent', 'project_manager',
      'field_engineer', 'accountant', 'subcontractor',
    ]
    for (const role of roles) {
      expect(canManageRole('viewer', role)).toBe(false)
    }
  })

  it('a role cannot manage itself', () => {
    expect(canManageRole('admin', 'admin')).toBe(false)
    expect(canManageRole('viewer', 'viewer')).toBe(false)
  })

  it('superintendent can manage project_manager but not admin', () => {
    expect(canManageRole('superintendent', 'project_manager')).toBe(true)
    expect(canManageRole('superintendent', 'admin')).toBe(false)
  })
})

// ─── PERMISSION COMPARISON ───────────────────────────────────────────────────

describe('compareRolePermissions', () => {
  it('returns empty arrays when comparing a role to itself', () => {
    const result = compareRolePermissions('admin', 'admin')
    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
  })

  it('all permissions are added when comparing viewer to admin', () => {
    const result = compareRolePermissions('viewer', 'admin')
    expect(result.added.length).toBeGreaterThan(0)
    expect(result.removed).toHaveLength(0)
  })

  it('all permissions are removed when comparing admin to viewer', () => {
    const result = compareRolePermissions('admin', 'viewer')
    expect(result.removed.length).toBeGreaterThan(0)
    expect(result.added).toHaveLength(0)
  })

  it('added + removed + unchanged = total permission count', () => {
    const result = compareRolePermissions('project_manager', 'accountant')
    const totalKeys = Object.keys(ROLE_PERMISSIONS.admin).length
    expect(result.added.length + result.removed.length + result.unchanged.length).toBe(totalKeys)
  })
})
