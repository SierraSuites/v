# Module 10: Teams & RBAC - Future Enhancements

**Document Version**: 1.0.0
**Date**: February 2, 2026
**Status**: Product Roadmap

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Tier 1: Quick Wins (1-2 weeks each)](#tier-1-quick-wins)
3. [Tier 2: UX Improvements (2-4 weeks each)](#tier-2-ux-improvements)
4. [Tier 3: Advanced Features (1-2 months each)](#tier-3-advanced-features)
5. [Tier 4: AI-Powered Features (2-3 months each)](#tier-4-ai-powered-features)
6. [Tier 5: Game-Changing Features (3-6 months each)](#tier-5-game-changing-features)
7. [Implementation Priority Matrix](#implementation-priority-matrix)
8. [Success Metrics](#success-metrics)

---

## Introduction

This document outlines 25 potential enhancements to Module 10 (Teams & RBAC system) that can be implemented after the MVP deployment. Each enhancement is rated by complexity (⭐ = simple, ⭐⭐⭐⭐⭐ = complex) and organized into tiers based on implementation timeline.

**Current MVP Status:**
- ✅ 7 built-in roles (admin, superintendent, PM, field engineer, viewer, accountant, subcontractor)
- ✅ 30 granular permissions across 10 categories
- ✅ Custom role creation with permission matrix editor
- ✅ Comprehensive audit logging
- ✅ <50ms permission checks
- ✅ Full RLS policies

**Post-MVP Goals:**
- Improve user experience for role management
- Add advanced permission features
- Leverage AI for smart suggestions
- Enable enterprise-grade features
- Build ecosystem around permissions

---

## Tier 1: Quick Wins

Implementation: 1-2 weeks each | High impact, low complexity

### 1. Role Templates Library ⭐

**What**: Pre-built role templates for common construction industry positions

**Why**:
- Saves time during initial setup
- Ensures industry best practices
- Reduces configuration errors
- Faster onboarding for new companies

**How It Works**:
```typescript
// Role template data structure
interface RoleTemplate {
  id: string
  name: string
  category: 'construction' | 'finance' | 'management' | 'safety'
  description: string
  icon: string
  color: string
  permissions: PermissionSet
  industry: string[]
  popularity: number
}

// Example templates
const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'site-safety-officer',
    name: 'Site Safety Officer',
    category: 'safety',
    description: 'Manages safety compliance, inspections, and incident reporting',
    icon: '🦺',
    color: '#F59E0B',
    permissions: {
      canViewAllProjects: true,
      canViewAllPhotos: true,
      canUploadPhotos: true,
      canViewReports: true,
      canManagePunchList: true,
      canResolvePunchItems: true,
      canUploadDocuments: true,
      canShareDocuments: true,
      // ... safety-focused permissions
    },
    industry: ['commercial', 'residential', 'industrial'],
    popularity: 87
  },
  {
    id: 'estimator',
    name: 'Estimator',
    category: 'finance',
    description: 'Creates cost estimates, manages bids, reviews financials',
    icon: '💰',
    color: '#10B981',
    permissions: {
      canViewAllProjects: true,
      canViewFinancials: true,
      canViewAnalytics: true,
      canExportData: true,
      canViewReports: true,
      canUploadDocuments: true,
      // ... estimating-focused permissions
    },
    industry: ['commercial', 'residential'],
    popularity: 72
  },
  {
    id: 'quality-inspector',
    name: 'Quality Inspector',
    category: 'construction',
    description: 'Performs quality checks, manages punch lists, documents issues',
    icon: '🔍',
    color: '#8B5CF6',
    permissions: {
      canViewAllProjects: true,
      canViewAllPhotos: true,
      canUploadPhotos: true,
      canManagePunchList: true,
      canResolvePunchItems: true,
      canViewPunchList: true,
      canUploadDocuments: true,
      // ... inspection-focused permissions
    },
    industry: ['commercial', 'residential', 'industrial'],
    popularity: 65
  },
  {
    id: 'materials-coordinator',
    name: 'Materials Coordinator',
    category: 'management',
    description: 'Manages material orders, deliveries, and inventory',
    icon: '📦',
    color: '#3B82F6',
    permissions: {
      canViewAllProjects: true,
      canManageTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canUploadPhotos: true,
      canUploadDocuments: true,
      canViewFinancials: true,
      // ... materials-focused permissions
    },
    industry: ['commercial', 'residential'],
    popularity: 58
  }
]
```

**UI Changes**:
```typescript
// Add "Use Template" button to role creation modal
export default function CreateCustomRoleModal() {
  const [showTemplates, setShowTemplates] = useState(false)

  return (
    <Modal>
      {step === 1 && (
        <>
          {/* Existing role details form */}

          <div className="border-t pt-4 mt-4">
            <button
              onClick={() => setShowTemplates(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <span className="text-lg">📋</span>
              <p className="font-semibold text-gray-700">Use a Template</p>
              <p className="text-xs text-gray-500">Start from a pre-built role</p>
            </button>
          </div>
        </>
      )}

      {showTemplates && (
        <TemplateSelector
          templates={ROLE_TEMPLATES}
          onSelect={(template) => {
            setFormData({
              roleName: template.name,
              description: template.description,
              color: template.color,
              icon: template.icon,
              permissions: template.permissions
            })
            setShowTemplates(false)
          }}
        />
      )}
    </Modal>
  )
}
```

**Business Value**:
- ⏱️ 80% faster role setup
- 📈 Higher adoption rate
- ✅ Fewer permission configuration errors
- 🎯 Industry-specific best practices

---

### 2. Bulk Role Assignment ⭐

**What**: Assign roles to multiple team members at once

**Why**:
- Faster onboarding of large teams
- Efficient role changes during restructuring
- Time-saving for admins
- Reduces repetitive clicks

**How It Works**:
```typescript
// Backend: Bulk assignment API
// app/api/teams/bulk-assign-roles/route.ts

interface BulkAssignRequest {
  memberIds: string[]
  role?: UserRole
  customRoleId?: string
}

export async function POST(req: NextRequest) {
  const { memberIds, role, customRoleId } = await req.json()

  // Validate permission
  const { hasPermission } = await getUserPermissions(userId)
  if (!hasPermission('canChangeRoles')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Bulk update with transaction
  const { data, error } = await supabase
    .from('team_members')
    .update({
      role: role || null,
      custom_role_id: customRoleId || null,
      updated_at: new Date().toISOString()
    })
    .in('id', memberIds)
    .eq('company_id', companyId)

  // Log each change in audit
  for (const memberId of memberIds) {
    await logAuditEntry({
      action: 'role_changed',
      resource_type: 'team_member',
      resource_id: memberId,
      reason: `Bulk assignment to ${role || 'custom role'}`
    })
  }

  return NextResponse.json({
    message: `Successfully updated ${memberIds.length} team members`,
    updated: data
  })
}
```

**UI Changes**:
```typescript
// Team members table with checkbox selection
export default function TeamMembersTable({ members }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  const handleBulkAssign = async (roleId: string, isCustom: boolean) => {
    await fetch('/api/teams/bulk-assign-roles', {
      method: 'POST',
      body: JSON.stringify({
        memberIds: selectedIds,
        ...(isCustom ? { customRoleId: roleId } : { role: roleId })
      })
    })

    // Refresh table
    refetchMembers()
    setSelectedIds([])
  }

  return (
    <>
      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 bg-blue-50 border-b border-blue-200 p-4 flex items-center justify-between">
          <span className="font-semibold text-blue-900">
            {selectedIds.length} member{selectedIds.length > 1 ? 's' : ''} selected
          </span>

          <div className="flex gap-2">
            <button onClick={() => setShowBulkActions(true)}>
              Assign Role
            </button>
            <button onClick={() => setSelectedIds([])}>
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table with checkboxes */}
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedIds.length === members.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(members.map(m => m.id))
                  } else {
                    setSelectedIds([])
                  }
                }}
              />
            </th>
            <th>Name</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(member.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds([...selectedIds, member.id])
                    } else {
                      setSelectedIds(selectedIds.filter(id => id !== member.id))
                    }
                  }}
                />
              </td>
              <td>{member.full_name}</td>
              <td><RoleBadge role={member.role} /></td>
              <td>...</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

**Business Value**:
- ⏱️ 95% faster for 10+ member role changes
- 🎯 Useful during company reorganizations
- ✅ Audit trail preserved for compliance

---

### 3. Permission Presets (Quick Toggles) ⭐

**What**: One-click presets like "Read-Only Access", "Full Access", "Financial Access"

**Why**:
- Faster role configuration
- Reduces cognitive load
- Ensures common permission combinations
- Prevents accidental over-permissioning

**How It Works**:
```typescript
// Permission preset definitions
interface PermissionPreset {
  id: string
  name: string
  description: string
  icon: string
  permissions: Partial<PermissionSet>
}

const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'read-only',
    name: 'Read-Only Access',
    description: 'Can view all data but cannot make changes',
    icon: '👁️',
    permissions: {
      canViewAllProjects: true,
      canViewAllPhotos: true,
      canViewAnalytics: true,
      canViewReports: true,
      canViewAllTasks: true,
      canViewPunchList: true,
      canViewFinancials: true,
      // All edit/delete/manage permissions: false
    }
  },
  {
    id: 'content-contributor',
    name: 'Content Contributor',
    description: 'Can upload and share photos/documents',
    icon: '📸',
    permissions: {
      canViewAllProjects: true,
      canUploadPhotos: true,
      canSharePhotos: true,
      canEditPhotoMetadata: true,
      canUploadDocuments: true,
      canShareDocuments: true
    }
  },
  {
    id: 'financial-access',
    name: 'Financial Access',
    description: 'Full access to financial features',
    icon: '💰',
    permissions: {
      canViewAllProjects: true,
      canManageFinances: true,
      canApproveExpenses: true,
      canViewFinancials: true,
      canViewAnalytics: true,
      canExportData: true,
      canViewReports: true
    }
  },
  {
    id: 'task-manager',
    name: 'Task Manager',
    description: 'Can manage tasks and punch lists',
    icon: '✅',
    permissions: {
      canViewAllProjects: true,
      canManageTasks: true,
      canAssignTasks: true,
      canViewAllTasks: true,
      canManagePunchList: true,
      canResolvePunchItems: true,
      canViewPunchList: true
    }
  },
  {
    id: 'full-access',
    name: 'Full Access',
    description: 'All permissions enabled (admin-level)',
    icon: '🔓',
    permissions: Object.fromEntries(
      Object.keys(DEFAULT_PERMISSIONS).map(key => [key, true])
    ) as PermissionSet
  },
  {
    id: 'no-access',
    name: 'No Access',
    description: 'All permissions disabled',
    icon: '🔒',
    permissions: DEFAULT_PERMISSIONS // All false
  }
]
```

**UI Integration**:
```typescript
// Add preset selector to PermissionMatrixEditor
export default function PermissionMatrixEditor({ permissions, onChange }: Props) {
  const [showPresets, setShowPresets] = useState(false)

  const applyPreset = (preset: PermissionPreset) => {
    // Merge preset permissions with current
    const newPermissions = { ...permissions, ...preset.permissions }
    onChange(newPermissions)
    setShowPresets(false)
  }

  return (
    <div>
      {/* Preset selector */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Permissions</h3>

        <button
          onClick={() => setShowPresets(!showPresets)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Zap className="w-4 h-4" />
          Quick Presets
        </button>
      </div>

      {showPresets && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900 mb-3 font-semibold">
            Apply a preset to quickly configure permissions:
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PERMISSION_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="font-semibold text-sm text-gray-900">
                    {preset.name}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Existing permission matrix */}
      {/* ... */}
    </div>
  )
}
```

**Business Value**:
- ⏱️ 70% faster permission configuration
- ✅ Reduces over-permissioning risks
- 🎯 Common use cases covered

---

### 4. Role Comparison View ⭐⭐

**What**: Side-by-side comparison of 2-3 roles showing permission differences

**Why**:
- Helps admins understand role hierarchy
- Easier to choose between similar roles
- Identifies permission gaps
- Aids in custom role design

**How It Works**:
```typescript
// Role comparison component
interface RoleComparisonProps {
  roleIds: string[] // Up to 3 role IDs
}

export default function RoleComparison({ roleIds }: RoleComparisonProps) {
  const [roles, setRoles] = useState<(UserRole | CustomRole)[]>([])

  useEffect(() => {
    // Fetch role details
    loadRoles()
  }, [roleIds])

  // Calculate permission diff
  const getPermissionStatus = (permission: keyof PermissionSet) => {
    return roles.map(role => role.permissions[permission])
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 bg-gray-50 p-4 text-left font-semibold">
              Permission
            </th>
            {roles.map(role => (
              <th key={role.id} className="p-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: getRoleColor(role) }}
                  >
                    {getRoleIcon(role)}
                  </div>
                  <span className="font-semibold text-sm">
                    {getRoleDisplayName(role)}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_GROUPS.map(group => (
            <>
              {/* Group header */}
              <tr className="bg-gray-100">
                <td colSpan={roles.length + 1} className="p-2 font-semibold text-sm">
                  {group.icon} {group.name}
                </td>
              </tr>

              {/* Permissions in group */}
              {group.permissions.map(permission => {
                const statuses = getPermissionStatus(permission.key)
                const allSame = statuses.every(s => s === statuses[0])

                return (
                  <tr
                    key={permission.key}
                    className={`border-b ${!allSame ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="sticky left-0 bg-white p-3 text-sm">
                      {permission.label}
                      {!allSame && (
                        <span className="ml-2 text-xs text-yellow-700">
                          ⚠️ Differs
                        </span>
                      )}
                    </td>
                    {statuses.map((hasPermission, idx) => (
                      <td key={idx} className="p-3 text-center">
                        {hasPermission ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>

        {/* Summary row */}
        <tfoot>
          <tr className="bg-gray-50 font-semibold">
            <td className="sticky left-0 bg-gray-50 p-4">Total Permissions</td>
            {roles.map(role => {
              const count = Object.values(role.permissions).filter(Boolean).length
              return (
                <td key={role.id} className="p-4 text-center">
                  {count} / 30
                </td>
              )
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
```

**UI Integration**:
```typescript
// Add "Compare" button to roles page
export default function RolesPage() {
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2>Roles & Permissions</h2>

        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`px-4 py-2 rounded-lg ${
            compareMode ? 'bg-blue-600 text-white' : 'bg-white border'
          }`}
        >
          {compareMode ? 'Exit Compare Mode' : 'Compare Roles'}
        </button>
      </div>

      {compareMode && selectedForCompare.length > 1 && (
        <RoleComparison roleIds={selectedForCompare} />
      )}

      {/* Role grid with selection */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {allRoles.map(role => (
          <div
            key={role.id}
            className={`border rounded-lg p-4 cursor-pointer ${
              selectedForCompare.includes(role.id)
                ? 'ring-2 ring-blue-500'
                : ''
            }`}
            onClick={() => {
              if (compareMode) {
                if (selectedForCompare.includes(role.id)) {
                  setSelectedForCompare(selectedForCompare.filter(id => id !== role.id))
                } else if (selectedForCompare.length < 3) {
                  setSelectedForCompare([...selectedForCompare, role.id])
                }
              }
            }}
          >
            {/* Role card content */}
          </div>
        ))}
      </div>
    </>
  )
}
```

**Business Value**:
- 🎯 Better understanding of role differences
- ✅ Helps choose right role for team members
- 📊 Visual permission gap analysis

---

### 5. Export/Import Role Configurations ⭐

**What**: Download custom roles as JSON, import to other companies

**Why**:
- Share role configurations across subsidiaries
- Backup custom roles
- Migrate configurations between environments
- Enable role marketplace (future)

**How It Works**:
```typescript
// Export role to JSON
export async function exportRole(roleId: string): Promise<Blob> {
  const role = await customRolesService.getCustomRole(roleId)

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    role: {
      role_name: role.role_name,
      description: role.description,
      color: role.color,
      icon: role.icon,
      permissions: role.permissions
    }
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })

  return blob
}

// Import role from JSON
export async function importRole(
  companyId: string,
  jsonFile: File
): Promise<CustomRole> {
  const text = await jsonFile.text()
  const importData = JSON.parse(text)

  // Validate schema
  if (!importData.version || !importData.role) {
    throw new Error('Invalid role export file')
  }

  // Create role with imported data
  const role = await customRolesService.createCustomRole(
    companyId,
    importData.role.role_name,
    importData.role.permissions,
    {
      description: importData.role.description,
      color: importData.role.color,
      icon: importData.role.icon
    }
  )

  return role
}
```

**UI Integration**:
```typescript
// Add export/import buttons to role detail view
export default function RoleDetailView({ role }: Props) {
  const handleExport = async () => {
    const blob = await exportRole(role.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `role-${role.role_slug}-${Date.now()}.json`
    a.click()
  }

  const handleImport = async (file: File) => {
    try {
      const imported = await importRole(companyId, file)
      toast.success(`Role "${imported.role_name}" imported successfully`)
      refetchRoles()
    } catch (error) {
      toast.error('Failed to import role: ' + error.message)
    }
  }

  return (
    <div>
      {/* Role details */}

      <div className="flex gap-2 mt-4">
        <button onClick={handleExport} className="btn-secondary">
          <Download className="w-4 h-4" />
          Export Role
        </button>

        <label className="btn-secondary cursor-pointer">
          <Upload className="w-4 h-4" />
          Import Role
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleImport(e.target.files[0])
              }
            }}
          />
        </label>
      </div>
    </div>
  )
}
```

**Business Value**:
- 🔄 Easy role replication across companies
- 💾 Configuration backup
- 🚀 Faster multi-company setup

---

## Tier 2: UX Improvements

Implementation: 2-4 weeks each | Moderate complexity, high user satisfaction

### 6. Visual Role Builder (Drag & Drop) ⭐⭐⭐

**What**: Drag-and-drop interface for creating roles by combining permission groups

**Why**:
- More intuitive than checkboxes
- Visual understanding of role composition
- Gamified experience
- Appeals to non-technical users

**How It Works**:
```typescript
// Visual role builder using react-beautiful-dnd
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface PermissionBlock {
  id: string
  name: string
  description: string
  icon: string
  color: string
  permissions: (keyof PermissionSet)[]
}

const PERMISSION_BLOCKS: PermissionBlock[] = [
  {
    id: 'project-viewer',
    name: 'Project Viewer',
    description: 'Can view all project information',
    icon: '👁️',
    color: '#3B82F6',
    permissions: ['canViewAllProjects']
  },
  {
    id: 'project-editor',
    name: 'Project Editor',
    description: 'Can edit and create projects',
    icon: '✏️',
    color: '#10B981',
    permissions: ['canViewAllProjects', 'canEditProjects', 'canCreateProjects']
  },
  {
    id: 'photo-manager',
    name: 'Photo Manager',
    description: 'Full photo management access',
    icon: '📸',
    color: '#F59E0B',
    permissions: ['canViewAllPhotos', 'canUploadPhotos', 'canDeletePhotos', 'canSharePhotos', 'canEditPhotoMetadata']
  },
  {
    id: 'financial-viewer',
    name: 'Financial Viewer',
    description: 'Can view financial data',
    icon: '💰',
    color: '#8B5CF6',
    permissions: ['canViewFinancials', 'canViewAnalytics', 'canViewReports']
  },
  {
    id: 'task-coordinator',
    name: 'Task Coordinator',
    description: 'Manage tasks and assignments',
    icon: '✅',
    color: '#EC4899',
    permissions: ['canManageTasks', 'canAssignTasks', 'canViewAllTasks']
  }
]

export default function VisualRoleBuilder() {
  const [availableBlocks, setAvailableBlocks] = useState(PERMISSION_BLOCKS)
  const [selectedBlocks, setSelectedBlocks] = useState<PermissionBlock[]>([])

  const handleDragEnd = (result: any) => {
    const { source, destination } = result

    if (!destination) return

    // Moving from available to selected
    if (source.droppableId === 'available' && destination.droppableId === 'selected') {
      const block = availableBlocks[source.index]
      setAvailableBlocks(availableBlocks.filter((_, idx) => idx !== source.index))
      setSelectedBlocks([...selectedBlocks, block])
    }

    // Moving from selected to available
    if (source.droppableId === 'selected' && destination.droppableId === 'available') {
      const block = selectedBlocks[source.index]
      setSelectedBlocks(selectedBlocks.filter((_, idx) => idx !== source.index))
      setAvailableBlocks([...availableBlocks, block])
    }
  }

  // Calculate final permissions from selected blocks
  const getFinalPermissions = (): PermissionSet => {
    const permissions: Partial<PermissionSet> = {}
    selectedBlocks.forEach(block => {
      block.permissions.forEach(perm => {
        permissions[perm] = true
      })
    })
    return { ...DEFAULT_PERMISSIONS, ...permissions }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-6">
        {/* Available blocks */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">
            Available Permission Blocks
          </h3>
          <Droppable droppableId="available">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[400px] p-4 rounded-lg border-2 border-dashed ${
                  snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                {availableBlocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`mb-3 p-4 rounded-lg border-2 cursor-move transition-all ${
                          snapshot.isDragging
                            ? 'shadow-lg scale-105 rotate-2'
                            : 'shadow hover:shadow-md'
                        }`}
                        style={{
                          backgroundColor: block.color + '20',
                          borderColor: block.color,
                          ...provided.draggableProps.style
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{block.icon}</span>
                          <div>
                            <p className="font-semibold text-sm">{block.name}</p>
                            <p className="text-xs text-gray-600">{block.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {block.permissions.length} permission{block.permissions.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Selected blocks */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">
            Your Custom Role
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({Object.values(getFinalPermissions()).filter(Boolean).length} total permissions)
            </span>
          </h3>
          <Droppable droppableId="selected">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[400px] p-4 rounded-lg border-2 border-dashed ${
                  snapshot.isDraggingOver ? 'border-green-500 bg-green-50' : 'border-gray-300'
                } ${selectedBlocks.length === 0 ? 'flex items-center justify-center' : ''}`}
              >
                {selectedBlocks.length === 0 ? (
                  <p className="text-gray-400 text-center">
                    Drag permission blocks here to build your role
                  </p>
                ) : (
                  selectedBlocks.map((block, index) => (
                    <Draggable key={block.id} draggableId={block.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`mb-3 p-4 rounded-lg border-2 cursor-move transition-all ${
                            snapshot.isDragging
                              ? 'shadow-lg scale-105 rotate-2'
                              : 'shadow hover:shadow-md'
                          }`}
                          style={{
                            backgroundColor: block.color + '20',
                            borderColor: block.color,
                            ...provided.draggableProps.style
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{block.icon}</span>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{block.name}</p>
                              <p className="text-xs text-gray-600">{block.description}</p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedBlocks(selectedBlocks.filter((_, idx) => idx !== index))
                                setAvailableBlocks([...availableBlocks, block])
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>

      {/* Preview button */}
      {selectedBlocks.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              const permissions = getFinalPermissions()
              console.log('Final permissions:', permissions)
              // Apply to role creation
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Use These Permissions ({Object.values(getFinalPermissions()).filter(Boolean).length})
          </button>
        </div>
      )}
    </DragDropContext>
  )
}
```

**Business Value**:
- 🎮 More engaging user experience
- 🎨 Visual understanding of role composition
- ⏱️ 50% faster for non-technical users

---

### 7. Smart Permission Suggestions ⭐⭐

**What**: AI-powered suggestions based on role name and description

**Why**:
- Reduces guesswork
- Ensures complete permission sets
- Learns from existing roles
- Improves role quality

**How It Works**:
```typescript
// Smart suggestion engine
export async function getSuggestedPermissions(
  roleName: string,
  description: string,
  existingRoles: CustomRole[]
): Promise<{
  suggestions: PermissionSet
  confidence: number
  reasoning: string[]
}> {
  // 1. Keyword matching
  const keywords = {
    'safety|inspector|compliance': ['canViewAllProjects', 'canUploadPhotos', 'canManagePunchList'],
    'finance|accounting|budget': ['canManageFinances', 'canViewFinancials', 'canApproveExpenses'],
    'photo|camera|documentation': ['canUploadPhotos', 'canSharePhotos', 'canEditPhotoMetadata'],
    'task|coordinator|scheduler': ['canManageTasks', 'canAssignTasks', 'canViewAllTasks']
  }

  const suggestions: Partial<PermissionSet> = {}
  const reasoning: string[] = []
  let matches = 0

  const searchText = `${roleName} ${description}`.toLowerCase()

  for (const [pattern, permissions] of Object.entries(keywords)) {
    const regex = new RegExp(pattern, 'i')
    if (regex.test(searchText)) {
      permissions.forEach(perm => {
        suggestions[perm as keyof PermissionSet] = true
      })
      matches++
      reasoning.push(`Detected "${pattern.split('|')[0]}" keywords`)
    }
  }

  // 2. Similarity to existing roles
  const similar = findSimilarRoles(roleName, existingRoles)
  if (similar.length > 0) {
    const topMatch = similar[0]
    Object.entries(topMatch.permissions).forEach(([key, value]) => {
      if (value && !suggestions[key as keyof PermissionSet]) {
        suggestions[key as keyof PermissionSet] = true
      }
    })
    reasoning.push(`Similar to existing role "${topMatch.role_name}"`)
  }

  // 3. Calculate confidence
  const confidence = Math.min(100, matches * 25 + (similar.length > 0 ? 25 : 0))

  return {
    suggestions: { ...DEFAULT_PERMISSIONS, ...suggestions },
    confidence,
    reasoning
  }
}

// Find similar roles using Levenshtein distance
function findSimilarRoles(roleName: string, existingRoles: CustomRole[]): CustomRole[] {
  return existingRoles
    .map(role => ({
      ...role,
      similarity: stringSimilarity(roleName.toLowerCase(), role.role_name.toLowerCase())
    }))
    .filter(r => r.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
}
```

**UI Integration**:
```typescript
// Add suggestion panel to role creation modal
export default function CreateCustomRoleModal() {
  const [suggestions, setSuggestions] = useState<any>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleGetSuggestions = async () => {
    const result = await getSuggestedPermissions(
      formData.roleName,
      formData.description,
      existingRoles
    )
    setSuggestions(result)
    setShowSuggestions(true)
  }

  const handleApplySuggestions = () => {
    setFormData({
      ...formData,
      permissions: suggestions.suggestions
    })
    setShowSuggestions(false)
    setStep(2) // Go to permissions step
  }

  return (
    <Modal>
      {step === 1 && (
        <>
          {/* Role name and description inputs */}

          {formData.roleName.length > 3 && (
            <div className="mt-4">
              <button
                onClick={handleGetSuggestions}
                className="w-full py-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <span className="text-lg">🤖</span>
                <p className="font-semibold text-purple-900">Get Smart Suggestions</p>
                <p className="text-xs text-purple-700">AI-powered permission recommendations</p>
              </button>
            </div>
          )}

          {showSuggestions && suggestions && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-900">Suggested Permissions</h4>
                <span className="text-xs px-2 py-1 bg-blue-200 text-blue-900 rounded-full">
                  {suggestions.confidence}% confidence
                </span>
              </div>

              <ul className="text-xs text-blue-800 space-y-1 mb-3">
                {suggestions.reasoning.map((reason: string, idx: number) => (
                  <li key={idx}>✓ {reason}</li>
                ))}
              </ul>

              <p className="text-sm text-blue-900 mb-3">
                {Object.values(suggestions.suggestions).filter(Boolean).length} permissions suggested
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleApplySuggestions}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Suggestions
                </button>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="px-4 py-2 border border-blue-300 text-blue-900 rounded-lg hover:bg-blue-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
```

**Business Value**:
- 🎯 Higher quality role configurations
- ⏱️ 60% faster role creation
- ✅ Reduced permission gaps

---

### 8. Permission Inheritance (Role Hierarchies) ⭐⭐⭐

**What**: Create role hierarchies where child roles inherit parent permissions

**Why**:
- DRY principle for role management
- Easier to maintain role families
- Automatic propagation of permission changes
- Clearer role relationships

**How It Works**:
```typescript
// Database schema addition
// Add parent_role_id to custom_roles table

interface CustomRoleWithInheritance extends CustomRole {
  parent_role_id: string | null
  inherited_permissions: PermissionSet
  override_permissions: Partial<PermissionSet>
}

// Calculate effective permissions with inheritance
export function getEffectivePermissions(
  role: CustomRoleWithInheritance,
  allRoles: CustomRoleWithInheritance[]
): PermissionSet {
  // Base case: no parent
  if (!role.parent_role_id) {
    return role.permissions
  }

  // Find parent role
  const parent = allRoles.find(r => r.id === role.parent_role_id)
  if (!parent) {
    return role.permissions
  }

  // Recursively get parent's effective permissions
  const parentPermissions = getEffectivePermissions(parent, allRoles)

  // Merge: parent permissions + this role's overrides
  const effective: PermissionSet = { ...parentPermissions }

  // Apply overrides
  Object.entries(role.override_permissions).forEach(([key, value]) => {
    effective[key as keyof PermissionSet] = value as boolean
  })

  return effective
}

// API endpoint to set parent role
// app/api/roles/[id]/set-parent/route.ts

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { parentRoleId } = await req.json()

  // Validate: prevent circular inheritance
  const isCircular = await checkCircularInheritance(params.id, parentRoleId)
  if (isCircular) {
    return NextResponse.json(
      { error: 'Circular inheritance detected' },
      { status: 400 }
    )
  }

  // Update role
  const { data, error } = await supabase
    .from('custom_roles')
    .update({ parent_role_id: parentRoleId })
    .eq('id', params.id)

  return NextResponse.json({ role: data })
}

async function checkCircularInheritance(
  roleId: string,
  newParentId: string
): Promise<boolean> {
  const visited = new Set<string>()
  let currentId: string | null = newParentId

  while (currentId) {
    if (visited.has(currentId)) return true
    if (currentId === roleId) return true

    visited.add(currentId)

    // Get parent of current
    const { data } = await supabase
      .from('custom_roles')
      .select('parent_role_id')
      .eq('id', currentId)
      .single()

    currentId = data?.parent_role_id || null
  }

  return false
}
```

**UI Integration**:
```typescript
// Role hierarchy visualizer
export default function RoleHierarchyView({ roles }: { roles: CustomRoleWithInheritance[] }) {
  // Build tree structure
  const roleTree = buildRoleTree(roles)

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Role Hierarchy</h3>

      {roleTree.map(node => (
        <RoleTreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  )
}

function RoleTreeNode({ node, depth }: { node: any; depth: number }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ marginLeft: depth * 24 }}>
      <div className="flex items-center gap-2 p-3 bg-white border rounded-lg">
        {node.children.length > 0 && (
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? '▼' : '▶'}
          </button>
        )}

        <div
          className="w-8 h-8 rounded flex items-center justify-center"
          style={{ backgroundColor: node.color }}
        >
          {node.icon}
        </div>

        <div className="flex-1">
          <p className="font-semibold text-sm">{node.role_name}</p>
          <p className="text-xs text-gray-500">
            {Object.values(getEffectivePermissions(node, allRoles)).filter(Boolean).length} permissions
            {node.parent_role_id && (
              <span className="ml-2 text-blue-600">
                (inherits from parent)
              </span>
            )}
          </p>
        </div>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="mt-2">
          {node.children.map((child: any) => (
            <RoleTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Example Hierarchy**:
```
Admin (30/30 permissions)
├── Project Manager (22/30 permissions)
│   ├── Assistant PM (15/30 permissions)
│   └── Junior PM (12/30 permissions)
├── Accountant (10/30 permissions)
│   └── Junior Accountant (7/30 permissions)
└── Field Engineer (18/30 permissions)
    ├── Senior Field Engineer (20/30 permissions)
    └── Field Technician (14/30 permissions)
```

**Business Value**:
- 🎯 Easier role family management
- ♻️ Reusable permission sets
- 🔄 Automatic updates cascade down

---

### 9. Activity-Based Access Control (Time/Location) ⭐⭐⭐⭐

**What**: Grant permissions based on time of day, day of week, or user location

**Why**:
- Enhanced security for sensitive operations
- Prevent after-hours data access
- Location-based permissions (jobsite only)
- Compliance with labor regulations

**How It Works**:
```typescript
// Permission constraint schema
interface PermissionConstraint {
  permission_key: keyof PermissionSet
  constraint_type: 'time_range' | 'day_of_week' | 'geofence' | 'ip_whitelist'
  constraint_value: any
  enabled: boolean
}

interface TimeRangeConstraint {
  start_time: string // "09:00"
  end_time: string   // "17:00"
  timezone: string   // "America/New_York"
}

interface GeofenceConstraint {
  latitude: number
  longitude: number
  radius_meters: number
  jobsite_id?: string
}

// Enhanced permission check with constraints
export async function checkPermissionWithConstraints(
  userId: string,
  permission: keyof PermissionSet,
  context: {
    timestamp?: Date
    location?: { lat: number; lng: number }
    ipAddress?: string
  }
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Check base permission
  const basePermissions = await getUserPermissions(userId)
  if (!basePermissions[permission]) {
    return { allowed: false, reason: 'Base permission denied' }
  }

  // 2. Get constraints for this permission
  const constraints = await getPermissionConstraints(userId, permission)

  // 3. Check each constraint
  for (const constraint of constraints) {
    if (!constraint.enabled) continue

    switch (constraint.constraint_type) {
      case 'time_range':
        const timeConstraint = constraint.constraint_value as TimeRangeConstraint
        const now = context.timestamp || new Date()
        const currentTime = format(now, 'HH:mm')

        if (currentTime < timeConstraint.start_time || currentTime > timeConstraint.end_time) {
          return {
            allowed: false,
            reason: `Permission only available between ${timeConstraint.start_time} and ${timeConstraint.end_time}`
          }
        }
        break

      case 'day_of_week':
        const allowedDays = constraint.constraint_value as number[] // [1, 2, 3, 4, 5] for Mon-Fri
        const dayOfWeek = (context.timestamp || new Date()).getDay()

        if (!allowedDays.includes(dayOfWeek)) {
          return {
            allowed: false,
            reason: 'Permission not available on this day of week'
          }
        }
        break

      case 'geofence':
        if (!context.location) {
          return { allowed: false, reason: 'Location required but not provided' }
        }

        const fence = constraint.constraint_value as GeofenceConstraint
        const distance = calculateDistance(
          context.location.lat,
          context.location.lng,
          fence.latitude,
          fence.longitude
        )

        if (distance > fence.radius_meters) {
          return {
            allowed: false,
            reason: `Must be within ${fence.radius_meters}m of jobsite`
          }
        }
        break

      case 'ip_whitelist':
        const allowedIPs = constraint.constraint_value as string[]

        if (context.ipAddress && !allowedIPs.includes(context.ipAddress)) {
          return { allowed: false, reason: 'IP address not whitelisted' }
        }
        break
    }
  }

  return { allowed: true }
}

// Distance calculation (Haversine formula)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
```

**UI for Managing Constraints**:
```typescript
export default function PermissionConstraintsEditor({
  roleId,
  permission
}: {
  roleId: string
  permission: keyof PermissionSet
}) {
  const [constraints, setConstraints] = useState<PermissionConstraint[]>([])
  const [adding, setAdding] = useState(false)

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm">Access Constraints</h4>
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + Add Constraint
        </button>
      </div>

      {constraints.map((constraint, idx) => (
        <div key={idx} className="mb-3 p-3 bg-gray-50 rounded border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {constraint.constraint_type.replace('_', ' ').toUpperCase()}
            </span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={constraint.enabled}
                onChange={(e) => {
                  const updated = [...constraints]
                  updated[idx].enabled = e.target.checked
                  setConstraints(updated)
                }}
              />
              <span className="text-xs">Enabled</span>
            </label>
          </div>

          {constraint.constraint_type === 'time_range' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={constraint.constraint_value.start_time}
                onChange={(e) => {
                  const updated = [...constraints]
                  updated[idx].constraint_value.start_time = e.target.value
                  setConstraints(updated)
                }}
                className="text-sm px-2 py-1 border rounded"
              />
              <input
                type="time"
                value={constraint.constraint_value.end_time}
                onChange={(e) => {
                  const updated = [...constraints]
                  updated[idx].constraint_value.end_time = e.target.value
                  setConstraints(updated)
                }}
                className="text-sm px-2 py-1 border rounded"
              />
            </div>
          )}

          {constraint.constraint_type === 'geofence' && (
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Latitude"
                value={constraint.constraint_value.latitude}
                className="w-full text-sm px-2 py-1 border rounded"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={constraint.constraint_value.longitude}
                className="w-full text-sm px-2 py-1 border rounded"
              />
              <input
                type="number"
                placeholder="Radius (meters)"
                value={constraint.constraint_value.radius_meters}
                className="w-full text-sm px-2 py-1 border rounded"
              />
            </div>
          )}
        </div>
      ))}

      {constraints.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No constraints. Permission available anytime, anywhere.
        </p>
      )}
    </div>
  )
}
```

**Business Value**:
- 🔒 Enhanced security for sensitive operations
- 📍 Location-based access control
- ⏰ Time-restricted permissions
- ✅ Compliance with regulations

---

### 10. Permission Analytics Dashboard ⭐⭐

**What**: Visual analytics showing permission usage, most-used roles, access patterns

**Why**:
- Identify unused permissions
- Optimize role configurations
- Detect security anomalies
- Data-driven role management

**How It Works**:
```typescript
// Analytics aggregation queries
export async function getPermissionAnalytics(
  companyId: string,
  timeRange: { start: Date; end: Date }
) {
  // 1. Role distribution
  const roleDistribution = await supabase
    .from('team_members')
    .select('role, custom_role_id, custom_roles(role_name)')
    .eq('company_id', companyId)
    .is('removed_at', null)

  // 2. Most denied permissions (from audit log)
  const deniedPermissions = await supabase
    .from('permission_audit_log')
    .select('permission_denied')
    .eq('company_id', companyId)
    .gte('created_at', timeRange.start.toISOString())
    .lte('created_at', timeRange.end.toISOString())
    .not('permission_denied', 'is', null)

  // 3. Permission usage frequency
  const permissionUsage = await supabase
    .from('permission_audit_log')
    .select('permission_granted, created_at')
    .eq('company_id', companyId)
    .gte('created_at', timeRange.start.toISOString())
    .lte('created_at', timeRange.end.toISOString())
    .not('permission_granted', 'is', null)

  // 4. Custom role adoption rate
  const customRoleCount = roleDistribution.filter(m => m.custom_role_id).length
  const builtInRoleCount = roleDistribution.filter(m => m.role).length

  return {
    roleDistribution: aggregateRoleDistribution(roleDistribution),
    topDeniedPermissions: aggregateTopDenied(deniedPermissions),
    permissionUsageByDay: aggregateUsageByDay(permissionUsage),
    customRoleAdoption: (customRoleCount / (customRoleCount + builtInRoleCount)) * 100,
    totalMembers: roleDistribution.length
  }
}
```

**Dashboard UI**:
```typescript
export default function PermissionAnalyticsDashboard({ companyId }: { companyId: string }) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Permission Analytics</h2>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Total Team Members"
          value={analytics?.totalMembers || 0}
          icon="👥"
          color="blue"
        />
        <KPICard
          title="Custom Role Adoption"
          value={`${Math.round(analytics?.customRoleAdoption || 0)}%`}
          icon="🎯"
          color="purple"
        />
        <KPICard
          title="Active Roles"
          value={Object.keys(analytics?.roleDistribution || {}).length}
          icon="🔑"
          color="green"
        />
        <KPICard
          title="Permission Denials"
          value={analytics?.topDeniedPermissions?.reduce((sum: number, p: any) => sum + p.count, 0) || 0}
          icon="🚫"
          color="red"
        />
      </div>

      {/* Role Distribution Pie Chart */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Role Distribution</h3>
        <PieChart
          data={Object.entries(analytics?.roleDistribution || {}).map(([role, count]) => ({
            name: role,
            value: count
          }))}
        />
      </div>

      {/* Permission Usage Timeline */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Permission Usage Over Time</h3>
        <LineChart
          data={analytics?.permissionUsageByDay || []}
          xKey="date"
          yKey="count"
        />
      </div>

      {/* Top Denied Permissions */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Most Denied Permissions</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Permission</th>
              <th className="text-right p-3">Denial Count</th>
              <th className="text-right p-3">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {(analytics?.topDeniedPermissions || []).map((item: any) => (
              <tr key={item.permission} className="border-b">
                <td className="p-3">{item.permission}</td>
                <td className="text-right p-3">{item.count}</td>
                <td className="text-right p-3">{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Business Value**:
- 📊 Data-driven role optimization
- 🔍 Identify permission gaps
- 🚨 Detect security issues
- 💡 Usage insights for improvements

---

## Tier 3: Advanced Features

Implementation: 1-2 months each | High complexity, enterprise features

### 11. Project-Specific Role Overrides ⭐⭐⭐

**What**: Override user permissions on a per-project basis

**Why**:
- Different projects need different access levels
- Temporary elevated permissions
- Guest access to specific projects
- External contractor access

**How It Works**:
```typescript
// Database schema for project-specific overrides
interface ProjectPermissionOverride {
  id: string
  project_id: string
  user_id: string
  override_type: 'additive' | 'restrictive' | 'replace'
  permissions: Partial<PermissionSet>
  expires_at: string | null
  created_at: string
}

// Enhanced permission check with project context
export async function getUserPermissionsForProject(
  userId: string,
  projectId: string
): Promise<PermissionSet> {
  // 1. Get base permissions (from role)
  const basePermissions = await getUserPermissions(userId)

  // 2. Get project-specific overrides
  const { data: overrides } = await supabase
    .from('project_permission_overrides')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .or('expires_at.is.null,expires_at.gt.now()')

  if (!overrides || overrides.length === 0) {
    return basePermissions
  }

  // 3. Apply overrides based on type
  let effectivePermissions = { ...basePermissions }

  for (const override of overrides) {
    switch (override.override_type) {
      case 'additive':
        // Add permissions on top of base
        Object.entries(override.permissions).forEach(([key, value]) => {
          if (value === true) {
            effectivePermissions[key as keyof PermissionSet] = true
          }
        })
        break

      case 'restrictive':
        // Remove permissions from base
        Object.entries(override.permissions).forEach(([key, value]) => {
          if (value === false) {
            effectivePermissions[key as keyof PermissionSet] = false
          }
        })
        break

      case 'replace':
        // Replace entirely for this project
        effectivePermissions = { ...DEFAULT_PERMISSIONS, ...override.permissions }
        break
    }
  }

  return effectivePermissions
}

// API endpoint to create project override
// app/api/projects/[projectId]/permissions/route.ts

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { userId, overrideType, permissions, expiresAt } = await req.json()

  // Validate: requester must have canManageTeam permission
  const requesterPerms = await getUserPermissionsForProject(requesterId, params.projectId)
  if (!requesterPerms.canManageTeam) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Create override
  const { data, error } = await supabase
    .from('project_permission_overrides')
    .insert({
      project_id: params.projectId,
      user_id: userId,
      override_type: overrideType,
      permissions,
      expires_at: expiresAt
    })

  // Log audit entry
  await logAuditEntry({
    user_id: requesterId,
    action: 'project_permission_override_created',
    resource_type: 'project_permission',
    resource_id: data.id,
    reason: `${overrideType} override for user ${userId} on project ${params.projectId}`
  })

  return NextResponse.json({ override: data }, { status: 201 })
}
```

**UI for Managing Overrides**:
```typescript
export default function ProjectPermissionOverrides({ projectId, userId }: Props) {
  const [overrideType, setOverrideType] = useState<'additive' | 'restrictive' | 'replace'>('additive')
  const [permissions, setPermissions] = useState<Partial<PermissionSet>>({})
  const [expiresAt, setExpiresAt] = useState<string>('')

  const handleCreateOverride = async () => {
    await fetch(`/api/projects/${projectId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        overrideType,
        permissions,
        expiresAt: expiresAt || null
      })
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Project-Specific Permissions</h3>

      {/* Override type selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Override Type</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setOverrideType('additive')}
            className={`p-3 border rounded-lg ${
              overrideType === 'additive' ? 'bg-green-50 border-green-500' : ''
            }`}
          >
            <span className="text-2xl block mb-1">➕</span>
            <p className="font-semibold text-sm">Additive</p>
            <p className="text-xs text-gray-600">Grant additional permissions</p>
          </button>

          <button
            onClick={() => setOverrideType('restrictive')}
            className={`p-3 border rounded-lg ${
              overrideType === 'restrictive' ? 'bg-red-50 border-red-500' : ''
            }`}
          >
            <span className="text-2xl block mb-1">➖</span>
            <p className="font-semibold text-sm">Restrictive</p>
            <p className="text-xs text-gray-600">Revoke specific permissions</p>
          </button>

          <button
            onClick={() => setOverrideType('replace')}
            className={`p-3 border rounded-lg ${
              overrideType === 'replace' ? 'bg-blue-50 border-blue-500' : ''
            }`}
          >
            <span className="text-2xl block mb-1">🔄</span>
            <p className="font-semibold text-sm">Replace</p>
            <p className="text-xs text-gray-600">Use custom set for project</p>
          </button>
        </div>
      </div>

      {/* Permission selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Permissions to Override</label>
        <PermissionMatrixEditor
          initialPermissions={permissions}
          onChange={setPermissions}
        />
      </div>

      {/* Expiration date */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Expiration Date (optional)
        </label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave empty for permanent override
        </p>
      </div>

      <button
        onClick={handleCreateOverride}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Create Override
      </button>
    </div>
  )
}
```

**Example Use Cases**:
- **External Auditor**: Base role is "Viewer", but granted temporary "canExportData" for audit period
- **Consultant**: Granted full access to Project A, but restricted from Project B
- **Subcontractor**: Can only upload photos to their assigned project
- **Emergency Access**: Temporarily elevate field engineer to PM level for critical issue

**Business Value**:
- 🎯 Granular per-project access control
- ⏱️ Time-limited access for contractors
- 🔒 Enhanced security with principle of least privilege
- ✅ Flexible permissions without role proliferation

---

### 12. Time-Limited Access (Temporary Roles) ⭐⭐

**What**: Assign roles that automatically expire after a set period

**Why**:
- Temporary contractors/consultants
- Trial periods for new hires
- Seasonal workers
- Project-based access

**How It Works**:
```typescript
// Add expires_at to team_members table

interface TeamMemberWithExpiration extends TeamMember {
  expires_at: string | null
  expiration_warning_sent: boolean
}

// Cron job to check expiring roles (run daily)
export async function checkExpiringRoles() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Find roles expiring within 24 hours
  const { data: expiringMembers } = await supabase
    .from('team_members')
    .select('*, profiles(*)')
    .not('expires_at', 'is', null)
    .lte('expires_at', tomorrow.toISOString())
    .gt('expires_at', new Date().toISOString())
    .eq('expiration_warning_sent', false)

  // Send warning emails
  for (const member of expiringMembers) {
    await sendExpirationWarningEmail({
      to: member.profiles.email,
      expiresAt: member.expires_at,
      role: member.role || member.custom_role_id
    })

    // Mark warning as sent
    await supabase
      .from('team_members')
      .update({ expiration_warning_sent: true })
      .eq('id', member.id)
  }

  // Find expired roles
  const { data: expiredMembers } = await supabase
    .from('team_members')
    .select('*')
    .not('expires_at', 'is', null)
    .lte('expires_at', new Date().toISOString())
    .is('removed_at', null)

  // Auto-revoke expired roles
  for (const member of expiredMembers) {
    await supabase
      .from('team_members')
      .update({
        removed_at: new Date().toISOString(),
        removed_by: null, // System-initiated
        removal_reason: 'Role expired automatically'
      })
      .eq('id', member.id)

    // Log audit entry
    await logAuditEntry({
      action: 'role_removed',
      resource_type: 'team_member',
      resource_id: member.id,
      reason: 'Automatic expiration'
    })
  }

  return {
    warningsSent: expiringMembers.length,
    rolesRevoked: expiredMembers.length
  }
}
```

**UI for Setting Expiration**:
```typescript
export default function InviteTeamMemberModal() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('viewer')
  const [hasExpiration, setHasExpiration] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')

  const handleSendInvitation = async () => {
    await fetch('/api/teams/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email,
        role,
        expiresAt: hasExpiration ? expiresAt : null
      })
    })
  }

  return (
    <Modal>
      <div className="space-y-4">
        {/* Email and role inputs */}

        {/* Expiration toggle */}
        <div className="border rounded-lg p-4">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={hasExpiration}
              onChange={(e) => setHasExpiration(e.target.checked)}
            />
            <span className="font-semibold">Set expiration date</span>
          </label>

          {hasExpiration && (
            <>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2 border rounded-lg"
              />

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    const date = new Date()
                    date.setDate(date.getDate() + 7)
                    setExpiresAt(date.toISOString().slice(0, 16))
                  }}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  +7 days
                </button>
                <button
                  onClick={() => {
                    const date = new Date()
                    date.setMonth(date.getMonth() + 1)
                    setExpiresAt(date.toISOString().slice(0, 16))
                  }}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  +1 month
                </button>
                <button
                  onClick={() => {
                    const date = new Date()
                    date.setMonth(date.getMonth() + 3)
                    setExpiresAt(date.toISOString().slice(0, 16))
                  }}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  +3 months
                </button>
              </div>

              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">
                  ⚠️ Access will be automatically revoked on{' '}
                  {new Date(expiresAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </>
          )}
        </div>

        <button onClick={handleSendInvitation} className="btn-primary">
          Send Invitation
        </button>
      </div>
    </Modal>
  )
}
```

**Expiration Warning Email Template**:
```typescript
const expirationWarningEmail = `
Hi {{user_name}},

Your access to {{company_name}} is set to expire in 24 hours.

Expiration Date: {{expires_at}}
Current Role: {{role_name}}

If you need continued access, please contact your administrator.

Thank you,
The {{company_name}} Team
`
```

**Business Value**:
- ⏱️ Automatic access revocation for temp workers
- 📧 Warning emails prevent surprises
- ✅ Compliance with contractor policies
- 🔒 Reduced security risk from forgotten access

---

### 13. Role Delegation ⭐⭐⭐

**What**: Allow users to temporarily delegate their permissions to another user

**Why**:
- Cover during vacation/sick leave
- Emergency access needs
- Training new employees
- Business continuity

**How It Works**:
```typescript
// Database schema for delegations
interface PermissionDelegation {
  id: string
  delegator_id: string  // User giving permissions
  delegate_id: string   // User receiving permissions
  permissions: Partial<PermissionSet> | 'all'
  reason: string
  starts_at: string
  expires_at: string
  is_active: boolean
  created_at: string
}

// Enhanced permission check with delegations
export async function getUserPermissionsWithDelegations(
  userId: string,
  projectId?: string
): Promise<PermissionSet> {
  // 1. Get user's base permissions
  const basePermissions = projectId
    ? await getUserPermissionsForProject(userId, projectId)
    : await getUserPermissions(userId)

  // 2. Get active delegations to this user
  const { data: delegations } = await supabase
    .from('permission_delegations')
    .select('*')
    .eq('delegate_id', userId)
    .eq('is_active', true)
    .lte('starts_at', new Date().toISOString())
    .gte('expires_at', new Date().toISOString())

  if (!delegations || delegations.length === 0) {
    return basePermissions
  }

  // 3. Merge delegated permissions
  const effectivePermissions = { ...basePermissions }

  for (const delegation of delegations) {
    if (delegation.permissions === 'all') {
      // Get delegator's full permissions
      const delegatorPerms = projectId
        ? await getUserPermissionsForProject(delegation.delegator_id, projectId)
        : await getUserPermissions(delegation.delegator_id)

      // Merge all of them
      Object.keys(delegatorPerms).forEach(key => {
        if (delegatorPerms[key as keyof PermissionSet]) {
          effectivePermissions[key as keyof PermissionSet] = true
        }
      })
    } else {
      // Merge specific permissions
      Object.entries(delegation.permissions).forEach(([key, value]) => {
        if (value === true) {
          effectivePermissions[key as keyof PermissionSet] = true
        }
      })
    }
  }

  return effectivePermissions
}

// API endpoint to create delegation
// app/api/delegations/route.ts

export async function POST(req: NextRequest) {
  const { delegateId, permissions, reason, startsAt, expiresAt } = await req.json()

  // Validation
  if (!delegateId || !permissions || !expiresAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Create delegation
  const { data, error } = await supabase
    .from('permission_delegations')
    .insert({
      delegator_id: userId,
      delegate_id: delegateId,
      permissions,
      reason,
      starts_at: startsAt || new Date().toISOString(),
      expires_at: expiresAt,
      is_active: true
    })

  // Log audit entry
  await logAuditEntry({
    user_id: userId,
    action: 'permission_delegation_created',
    resource_type: 'permission_delegation',
    resource_id: data.id,
    reason: `Delegated permissions to user ${delegateId}: ${reason}`
  })

  // Send notification to delegate
  await sendDelegationNotification({
    delegatorId: userId,
    delegateId,
    permissions,
    expiresAt
  })

  return NextResponse.json({ delegation: data }, { status: 201 })
}
```

**UI for Creating Delegation**:
```typescript
export default function CreateDelegationModal({ userId }: { userId: string }) {
  const [delegateId, setDelegateId] = useState('')
  const [delegationType, setDelegationType] = useState<'all' | 'specific'>('all')
  const [specificPermissions, setSpecificPermissions] = useState<Partial<PermissionSet>>({})
  const [reason, setReason] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  return (
    <Modal>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Delegate Your Permissions</h2>

        {/* Select delegate */}
        <div>
          <label className="block text-sm font-medium mb-2">Delegate to</label>
          <UserSelector
            value={delegateId}
            onChange={setDelegateId}
            placeholder="Select team member"
          />
        </div>

        {/* Delegation type */}
        <div>
          <label className="block text-sm font-medium mb-2">What to delegate</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDelegationType('all')}
              className={`p-4 border-2 rounded-lg ${
                delegationType === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <span className="text-2xl block mb-2">🔓</span>
              <p className="font-semibold text-sm">All Permissions</p>
              <p className="text-xs text-gray-600 mt-1">
                Delegate everything you can do
              </p>
            </button>

            <button
              onClick={() => setDelegationType('specific')}
              className={`p-4 border-2 rounded-lg ${
                delegationType === 'specific' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <span className="text-2xl block mb-2">🎯</span>
              <p className="font-semibold text-sm">Specific Permissions</p>
              <p className="text-xs text-gray-600 mt-1">
                Choose which permissions to delegate
              </p>
            </button>
          </div>
        </div>

        {/* Specific permissions selector */}
        {delegationType === 'specific' && (
          <div className="border rounded-lg p-4">
            <PermissionMatrixEditor
              initialPermissions={specificPermissions}
              onChange={setSpecificPermissions}
            />
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium mb-2">Reason for delegation</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., On vacation, covering for sick leave, etc."
            rows={2}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        {/* Time period */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Starts at</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Expires at *</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={startsAt || new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Quick duration buttons */}
        <div className="flex gap-2">
          {[1, 3, 7, 14].map(days => (
            <button
              key={days}
              onClick={() => {
                const start = new Date()
                const end = new Date()
                end.setDate(end.getDate() + days)
                setStartsAt(start.toISOString().slice(0, 16))
                setExpiresAt(end.toISOString().slice(0, 16))
              }}
              className="flex-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              {days} day{days > 1 ? 's' : ''}
            </button>
          ))}
        </div>

        <button
          onClick={handleCreateDelegation}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Delegation
        </button>
      </div>
    </Modal>
  )
}
```

**Business Value**:
- 🔄 Business continuity during absences
- 👥 Seamless coverage for vacations
- 🎓 Training tool for new hires
- ✅ Full audit trail of delegations

---

### 14. Multi-Tenant Permission Isolation ⭐⭐⭐⭐

**What**: Enhanced RLS policies to ensure perfect isolation between companies

**Why**:
- Critical for SaaS multi-tenancy
- Prevents data leaks between customers
- Compliance requirements
- Enterprise security standards

**How It Works**:
```sql
-- Ultra-strict RLS policies for custom_roles

-- Policy 1: Users can only see roles from their company
CREATE POLICY "Users can only view their company's custom roles"
ON custom_roles
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM team_members
    WHERE user_id = auth.uid()
    AND removed_at IS NULL
  )
);

-- Policy 2: Only company admins can create roles
CREATE POLICY "Only company admins can create custom roles"
ON custom_roles
FOR INSERT
WITH CHECK (
  -- User must be in this company
  company_id IN (
    SELECT tm.company_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.removed_at IS NULL
    -- User must have canManageTeam permission
    AND (
      tm.role IN ('admin', 'superintendent')
      OR EXISTS (
        SELECT 1 FROM custom_roles cr
        WHERE cr.id = tm.custom_role_id
        AND (cr.permissions->>'canManageTeam')::boolean = true
      )
    )
  )
);

-- Policy 3: Role updates restricted to company admins
CREATE POLICY "Only company admins can update custom roles"
ON custom_roles
FOR UPDATE
USING (
  company_id IN (
    SELECT tm.company_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.removed_at IS NULL
    AND (
      tm.role IN ('admin', 'superintendent')
      OR EXISTS (
        SELECT 1 FROM custom_roles cr
        WHERE cr.id = tm.custom_role_id
        AND (cr.permissions->>'canManageTeam')::boolean = true
      )
    )
  )
);

-- Policy 4: Prevent cross-company role deletion
CREATE POLICY "Only company admins can delete custom roles"
ON custom_roles
FOR DELETE
USING (
  company_id IN (
    SELECT tm.company_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.removed_at IS NULL
    AND tm.role = 'admin'
  )
);

-- Verification function to test RLS
CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS TABLE(test_name TEXT, passed BOOLEAN, details TEXT) AS $$
BEGIN
  -- Test 1: User from Company A cannot see Company B's roles
  RETURN QUERY
  SELECT
    'Cross-company role visibility'::TEXT,
    (COUNT(*) = 0)::BOOLEAN,
    format('Found %s roles from other companies', COUNT(*))
  FROM custom_roles
  WHERE company_id NOT IN (
    SELECT company_id FROM team_members
    WHERE user_id = auth.uid()
  );

  -- Test 2: User cannot assign themselves to another company's role
  RETURN QUERY
  SELECT
    'Cross-company role assignment'::TEXT,
    (COUNT(*) = 0)::BOOLEAN,
    format('Found %s team members with cross-company roles', COUNT(*))
  FROM team_members tm
  JOIN custom_roles cr ON tm.custom_role_id = cr.id
  WHERE tm.company_id != cr.company_id;

  -- Test 3: Audit log entries are company-scoped
  RETURN QUERY
  SELECT
    'Audit log isolation'::TEXT,
    (COUNT(*) = 0)::BOOLEAN,
    format('Found %s audit entries from other companies', COUNT(*))
  FROM permission_audit_log
  WHERE company_id IS NOT NULL
  AND company_id NOT IN (
    SELECT company_id FROM team_members
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Automated RLS Testing Suite**:
```typescript
// Test RLS isolation in CI/CD pipeline
export async function testRLSIsolation() {
  const results = []

  // Create two test companies
  const companyA = await createTestCompany('Company A')
  const companyB = await createTestCompany('Company B')

  // Create test users
  const userA = await createTestUser(companyA.id, 'admin')
  const userB = await createTestUser(companyB.id, 'admin')

  // Test 1: User A creates a custom role
  const roleA = await createCustomRole(userA.id, {
    roleName: 'Test Role A',
    permissions: { canViewAllProjects: true }
  })

  // Test 2: User B tries to view Role A (should fail)
  const { data: rolesSeenByB } = await supabase
    .from('custom_roles')
    .select('*')
    .eq('id', roleA.id)
    .as(userB)

  results.push({
    test: 'Cross-company role visibility',
    passed: rolesSeenByB.length === 0,
    message: rolesSeenByB.length === 0
      ? 'User B cannot see User A's role ✅'
      : 'RLS BREACH: User B can see User A's role ❌'
  })

  // Test 3: User B tries to update Role A (should fail)
  const { error: updateError } = await supabase
    .from('custom_roles')
    .update({ role_name: 'Hacked Role' })
    .eq('id', roleA.id)
    .as(userB)

  results.push({
    test: 'Cross-company role modification',
    passed: updateError !== null,
    message: updateError
      ? 'User B cannot modify User A's role ✅'
      : 'RLS BREACH: User B can modify User A's role ❌'
  })

  // Test 4: User B tries to assign Role A to their team member (should fail)
  const { error: assignError } = await supabase
    .from('team_members')
    .update({ custom_role_id: roleA.id })
    .eq('company_id', companyB.id)
    .as(userB)

  results.push({
    test: 'Cross-company role assignment',
    passed: assignError !== null,
    message: assignError
      ? 'User B cannot assign User A's role ✅'
      : 'RLS BREACH: User B can assign cross-company role ❌'
  })

  // Cleanup
  await deleteTestCompany(companyA.id)
  await deleteTestCompany(companyB.id)

  return results
}
```

**Business Value**:
- 🔒 Enterprise-grade security
- ✅ SOC 2 / ISO 27001 compliance
- 🛡️ Zero data leaks between customers
- 📊 Automated security testing

---

### 15. Approval Workflows for Role Changes ⭐⭐⭐

**What**: Require admin approval before certain role changes take effect

**Why**:
- Prevent unauthorized privilege escalation
- Audit trail for sensitive changes
- Compliance with change management policies
- Multi-step approval for critical roles

**How It Works**:
```typescript
// Database schema for approval workflows
interface RoleChangeRequest {
  id: string
  requester_id: string
  target_user_id: string
  requested_role: UserRole | null
  requested_custom_role_id: string | null
  current_role: UserRole | null
  current_custom_role_id: string | null
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
}

// Configuration: Which roles require approval
const ROLES_REQUIRING_APPROVAL: UserRole[] = ['admin', 'superintendent']

// API endpoint to request role change
// app/api/teams/role-change-requests/route.ts

export async function POST(req: NextRequest) {
  const { targetUserId, requestedRole, requestedCustomRoleId, reason } = await req.json()

  // Check if this role requires approval
  const requiresApproval =
    (requestedRole && ROLES_REQUIRING_APPROVAL.includes(requestedRole)) ||
    (requestedCustomRoleId && await customRoleRequiresApproval(requestedCustomRoleId))

  if (!requiresApproval) {
    // Direct assignment (no approval needed)
    await assignRoleDirectly(targetUserId, requestedRole, requestedCustomRoleId)
    return NextResponse.json({ message: 'Role assigned directly' })
  }

  // Create approval request
  const { data: request } = await supabase
    .from('role_change_requests')
    .insert({
      requester_id: userId,
      target_user_id: targetUserId,
      requested_role: requestedRole,
      requested_custom_role_id: requestedCustomRoleId,
      reason,
      status: 'pending'
    })
    .select()
    .single()

  // Notify admins
  const admins = await getCompanyAdmins(companyId)
  for (const admin of admins) {
    await sendApprovalRequestEmail({
      to: admin.email,
      requester: requesterProfile.full_name,
      targetUser: targetUserProfile.full_name,
      requestedRole: requestedRole || 'Custom Role',
      reason,
      approvalLink: `${process.env.NEXT_PUBLIC_URL}/teams/approvals/${request.id}`
    })
  }

  return NextResponse.json({
    message: 'Approval request created',
    request
  }, { status: 201 })
}

// API endpoint to approve/reject request
// app/api/teams/role-change-requests/[id]/review/route.ts

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { action, notes } = await req.json() // action: 'approve' | 'reject'

  // Verify reviewer has permission
  const reviewerPerms = await getUserPermissions(userId)
  if (!reviewerPerms.canManageTeam) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get request
  const { data: request } = await supabase
    .from('role_change_requests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (request.status !== 'pending') {
    return NextResponse.json(
      { error: 'Request already reviewed' },
      { status: 400 }
    )
  }

  // Update request status
  await supabase
    .from('role_change_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes
    })
    .eq('id', params.id)

  // If approved, apply role change
  if (action === 'approve') {
    await assignRoleDirectly(
      request.target_user_id,
      request.requested_role,
      request.requested_custom_role_id
    )

    // Log audit entry
    await logAuditEntry({
      action: 'role_changed',
      resource_type: 'team_member',
      resource_id: request.target_user_id,
      reason: `Approved by ${reviewerProfile.full_name}: ${notes || request.reason}`
    })
  }

  // Notify requester
  await sendApprovalDecisionEmail({
    to: requesterProfile.email,
    action,
    reviewer: reviewerProfile.full_name,
    notes
  })

  return NextResponse.json({ message: `Request ${action}d successfully` })
}
```

**Approval Dashboard UI**:
```typescript
export default function RoleChangeApprovals() {
  const [pendingRequests, setPendingRequests] = useState<RoleChangeRequest[]>([])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pending Role Change Requests</h2>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No pending requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map(request => (
            <div key={request.id} className="bg-white border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {request.requester.full_name} requests role change
                    </p>
                    <p className="text-sm text-gray-500">
                      for {request.target_user.full_name}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  Pending Review
                </span>
              </div>

              {/* Role change details */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Role</p>
                  <p className="font-semibold">
                    {request.current_role || request.current_custom_role?.role_name || 'None'}
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Requested Role</p>
                  <p className="font-semibold text-blue-600">
                    {request.requested_role || request.requested_custom_role?.role_name}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {request.reason}
                </p>
              </div>

              {/* Requested time */}
              <p className="text-xs text-gray-500 mb-4">
                Requested {formatDistanceToNow(new Date(request.requested_at))} ago
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(request.id, 'approve')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleReview(request.id, 'reject')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Business Value**:
- 🔒 Prevent unauthorized privilege escalation
- ✅ Compliance with change management policies
- 📝 Complete audit trail of approvals
- 👥 Multi-step approval for critical roles

---

## Tier 4: AI-Powered Features

Implementation: 2-3 months each | AI/ML integration, advanced intelligence

### 16. AI-Powered Permission Conflict Detection ⭐⭐⭐⭐

**What**: Automatically detect and flag permission conflicts, over-permissions, and security risks

**Why**:
- Identify security vulnerabilities proactively
- Prevent permission creep
- Suggest optimal permission sets
- Reduce attack surface

**How It Works**:
```typescript
// Permission conflict analyzer using ML patterns
export async function analyzePermissionConflicts(companyId: string) {
  const conflicts = []
  const warnings = []
  const suggestions = []

  // Get all team members and their permissions
  const members = await getAllCompanyMembers(companyId)

  for (const member of members) {
    const perms = await getUserPermissions(member.user_id)

    // Rule 1: Detect separation of duties violations
    if (perms.canManageFinances && perms.canApproveExpenses) {
      conflicts.push({
        severity: 'high',
        type: 'separation_of_duties_violation',
        user: member,
        message: 'User can both manage finances and approve expenses (SoD violation)',
        recommendation: 'Split financial management and approval into separate roles',
        riskScore: 85
      })
    }

    // Rule 2: Over-privileged users (more than 20 permissions)
    const permCount = Object.values(perms).filter(Boolean).length
    if (permCount > 20) {
      warnings.push({
        severity: 'medium',
        type: 'over_privileged',
        user: member,
        message: `User has ${permCount}/30 permissions (over-privileged)`,
        recommendation: 'Review and remove unnecessary permissions',
        riskScore: 60
      })
    }

    // Rule 3: Inactive users with high permissions
    const lastActive = await getUserLastActivity(member.user_id)
    const daysSinceActive = differenceInDays(new Date(), lastActive)

    if (daysSinceActive > 30 && permCount > 10) {
      conflicts.push({
        severity: 'high',
        type: 'inactive_with_permissions',
        user: member,
        message: `User inactive for ${daysSinceActive} days but has ${permCount} permissions`,
        recommendation: 'Revoke or reduce permissions for inactive user',
        riskScore: 75
      })
    }

    // Rule 4: Conflicting permission combinations
    if (perms.canDeleteProjects && !perms.canViewAllProjects) {
      warnings.push({
        severity: 'low',
        type: 'logical_conflict',
        user: member,
        message: 'User can delete projects but cannot view all projects',
        recommendation: 'Grant canViewAllProjects for consistency',
        riskScore: 30
      })
    }

    // Rule 5: Minimum required permissions not met
    if (member.role === 'project_manager' && !perms.canViewAllProjects) {
      conflicts.push({
        severity: 'medium',
        type: 'insufficient_permissions',
        user: member,
        message: 'Project Manager role should have canViewAllProjects',
        recommendation: 'Grant missing permission or change role',
        riskScore: 50
      })
    }
  }

  // Company-wide analysis
  const adminCount = members.filter(m => m.role === 'admin').length

  if (adminCount > members.length * 0.3) {
    warnings.push({
      severity: 'medium',
      type: 'too_many_admins',
      message: `${adminCount} admins (${Math.round((adminCount / members.length) * 100)}% of team)`,
      recommendation: 'Reduce number of admins, use role delegation instead',
      riskScore: 55
    })
  }

  // AI-powered anomaly detection
  const anomalies = await detectPermissionAnomalies(members)
  conflicts.push(...anomalies)

  return {
    conflicts,
    warnings,
    suggestions,
    overallRiskScore: calculateOverallRisk(conflicts, warnings),
    summary: {
      totalIssues: conflicts.length + warnings.length,
      highSeverity: conflicts.filter(c => c.severity === 'high').length,
      mediumSeverity: [...conflicts, ...warnings].filter(c => c.severity === 'medium').length,
      lowSeverity: warnings.filter(w => w.severity === 'low').length
    }
  }
}

// ML-based anomaly detection
async function detectPermissionAnomalies(members: TeamMember[]) {
  const anomalies = []

  // Calculate permission patterns
  const permissionVectors = members.map(m => ({
    user: m,
    vector: permissionsToVector(m.permissions)
  }))

  // Use K-means clustering to find outliers
  const clusters = kMeansClustering(permissionVectors, 3)
  const outliers = findOutliers(permissionVectors, clusters)

  for (const outlier of outliers) {
    anomalies.push({
      severity: 'medium',
      type: 'anomalous_permissions',
      user: outlier.user,
      message: 'Permission set differs significantly from team norms',
      recommendation: 'Review permissions for consistency',
      riskScore: 65,
      distance: outlier.distance
    })
  }

  return anomalies
}
```

**Conflict Detection Dashboard**:
```typescript
export default function PermissionConflictDashboard({ companyId }: { companyId: string }) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runAnalysis()
  }, [])

  const runAnalysis = async () => {
    setLoading(true)
    const result = await analyzePermissionConflicts(companyId)
    setAnalysis(result)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Permission Security Analysis</h2>

        <button
          onClick={runAnalysis}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Re-analyze
        </button>
      </div>

      {/* Risk Score Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Overall Security Risk</p>
            <p className="text-4xl font-bold mt-2">
              {analysis?.overallRiskScore || 0}/100
            </p>
          </div>
          <div className="w-24 h-24">
            <CircularProgress
              value={analysis?.overallRiskScore || 0}
              color={
                analysis?.overallRiskScore > 70 ? 'red' :
                analysis?.overallRiskScore > 40 ? 'yellow' : 'green'
              }
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Total Issues"
          value={analysis?.summary.totalIssues || 0}
          icon="⚠️"
          color="gray"
        />
        <KPICard
          title="High Severity"
          value={analysis?.summary.highSeverity || 0}
          icon="🔴"
          color="red"
        />
        <KPICard
          title="Medium Severity"
          value={analysis?.summary.mediumSeverity || 0}
          icon="🟡"
          color="yellow"
        />
        <KPICard
          title="Low Severity"
          value={analysis?.summary.lowSeverity || 0}
          icon="🟢"
          color="green"
        />
      </div>

      {/* Conflicts List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Detected Conflicts</h3>

        {analysis?.conflicts.map((conflict: any, idx: number) => (
          <div key={idx} className={`border-l-4 rounded-lg p-4 ${
            conflict.severity === 'high' ? 'border-red-500 bg-red-50' :
            conflict.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
            'border-blue-500 bg-blue-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${
                  conflict.severity === 'high' ? 'text-red-600' :
                  conflict.severity === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
                <span className="font-semibold">
                  {conflict.type.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <span className="px-2 py-1 bg-white rounded text-xs font-medium">
                Risk: {conflict.riskScore}/100
              </span>
            </div>

            <p className="text-sm mb-2">{conflict.message}</p>

            {conflict.user && (
              <p className="text-xs text-gray-600 mb-2">
                Affects: {conflict.user.full_name} ({conflict.user.role})
              </p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs italic">💡 {conflict.recommendation}</p>

              <button className="px-3 py-1 bg-white border rounded text-xs hover:bg-gray-50">
                Fix Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Business Value**:
- 🛡️ Proactive security vulnerability detection
- 📉 Reduce permission creep by 80%
- 🤖 AI-powered anomaly detection
- ✅ Automated compliance checks

---

### 17. Natural Language Role Creation ⭐⭐⭐⭐⭐

**What**: Create roles by describing them in plain English (e.g., "Create a role for site inspectors who can view projects and upload photos")

**Why**:
- Non-technical users can create roles
- Faster role configuration
- Natural interface
- Reduces learning curve

**How It Works**:
```typescript
// OpenAI GPT-4 integration for NLP role creation
export async function createRoleFromNaturalLanguage(
  description: string,
  companyId: string
): Promise<{
  roleName: string
  permissions: PermissionSet
  confidence: number
  reasoning: string[]
}> {
  // Call OpenAI API with structured prompt
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an expert in construction management software role-based access control.

Given a natural language description of a role, extract:
1. Role name (2-4 words)
2. Which of these 30 permissions should be granted:
${Object.keys(DEFAULT_PERMISSIONS).join(', ')}

Respond in JSON format:
{
  "roleName": "...",
  "permissions": {...},
  "reasoning": ["...", "..."]
}`
      },
      {
        role: 'user',
        content: description
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })

  const result = JSON.parse(completion.choices[0].message.content)

  // Validate permissions
  const validatedPermissions = validateAndNormalizePermissions(result.permissions)

  return {
    roleName: result.roleName,
    permissions: validatedPermissions,
    confidence: calculateConfidence(result),
    reasoning: result.reasoning
  }
}

// Example API endpoint
// app/api/roles/create-from-nl/route.ts

export async function POST(req: NextRequest) {
  const { description } = await req.json()

  try {
    const result = await createRoleFromNaturalLanguage(description, companyId)

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse role description' },
      { status: 400 }
    )
  }
}
```

**Natural Language Interface**:
```typescript
export default function NaturalLanguageRoleCreator() {
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    const response = await fetch('/api/roles/create-from-nl', {
      method: 'POST',
      body: JSON.stringify({ description })
    })
    const data = await response.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create Role with AI 🤖</h2>

      {/* Natural language input */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Describe the role in your own words
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., 'I need a role for quality inspectors who can view all projects, upload and share photos, manage punch lists, but cannot make financial decisions or delete anything'"
          rows={4}
          className="w-full px-4 py-3 border rounded-lg"
        />

        <p className="text-xs text-gray-500 mt-2">
          💡 Be specific about what this role should and shouldn't be able to do
        </p>
      </div>

      {/* Example prompts */}
      <div>
        <p className="text-sm font-medium mb-2">Example descriptions:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Safety officer who documents incidents and reviews photos',
            'External consultant with read-only access to specific projects',
            'Accountant who can view financials but not approve expenses',
            'Subcontractor who can only upload photos to their assigned project'
          ].map(example => (
            <button
              key={example}
              onClick={() => setDescription(example)}
              className="px-3 py-2 text-xs border rounded-lg hover:bg-gray-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!description || loading}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Role
          </>
        )}
      </button>

      {/* Generated result */}
      {result && (
        <div className="border rounded-lg p-6 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{result.roleName}</h3>
            <span className="px-3 py-1 bg-white rounded-full text-sm">
              {result.confidence}% confidence
            </span>
          </div>

          {/* AI reasoning */}
          <div className="mb-4 p-3 bg-white rounded">
            <p className="text-sm font-medium mb-2">🤖 AI Analysis:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              {result.reasoning.map((reason: string, idx: number) => (
                <li key={idx}>• {reason}</li>
              ))}
            </ul>
          </div>

          {/* Permission preview */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Suggested Permissions:</p>
            <PermissionMatrixEditor
              initialPermissions={result.permissions}
              onChange={() => {}}
              readOnly={false}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleCreateRole(result)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create This Role
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-4 py-2 border rounded-lg hover:bg-white"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Example Inputs & Outputs**:
```typescript
const examples = [
  {
    input: 'Site safety officer who documents safety incidents and reviews compliance photos',
    output: {
      roleName: 'Site Safety Officer',
      permissions: {
        canViewAllProjects: true,
        canViewAllPhotos: true,
        canUploadPhotos: true,
        canSharePhotos: true,
        canUploadDocuments: true,
        canViewReports: true,
        canManagePunchList: true,
        canViewPunchList: true
      },
      reasoning: [
        'Granted canViewAllProjects for site-wide safety oversight',
        'Granted photo permissions for safety documentation',
        'Granted punch list access for safety-related items',
        'Withheld financial and deletion permissions (not safety-related)'
      ]
    }
  },
  {
    input: 'External auditor with temporary read-only access to financial data',
    output: {
      roleName: 'External Auditor',
      permissions: {
        canViewAllProjects: true,
        canViewFinancials: true,
        canViewAnalytics: true,
        canExportData: true,
        canViewReports: true
      },
      reasoning: [
        'Granted financial viewing permissions for audit purposes',
        'Granted export access for audit documentation',
        'Withheld all modification permissions (read-only requirement)',
        'Withheld team management (external user)'
      ]
    }
  }
]
```

**Business Value**:
- 🚀 90% faster role creation
- 👥 Accessible to non-technical users
- 🎯 Accurate intent recognition
- ✨ Delightful user experience

---

### 18. Permission Recommendation Engine ⭐⭐⭐⭐

**What**: AI suggests permission changes based on user behavior and usage patterns

**Why**:
- Optimize permissions based on actual usage
- Identify unused permissions
- Suggest role upgrades/downgrades
- Continuous permission tuning

**How It Works**:
```typescript
// Behavioral analysis for permission recommendations
export async function analyzeUserBehaviorAndRecommend(
  userId: string,
  lookbackDays: number = 90
): Promise<{
  recommendations: Recommendation[]
  currentUtilization: number
  projectedUtilization: number
}> {
  // 1. Get user's current permissions
  const currentPerms = await getUserPermissions(userId)

  // 2. Analyze permission usage from audit logs
  const { data: usageLogs } = await supabase
    .from('permission_audit_log')
    .select('permission_granted, created_at')
    .eq('user_id', userId)
    .gte('created_at', subDays(new Date(), lookbackDays).toISOString())

  // 3. Calculate permission utilization
  const usedPermissions = new Set(usageLogs.map(log => log.permission_granted))
  const grantedPermissions = Object.entries(currentPerms)
    .filter(([_, granted]) => granted)
    .map(([perm, _]) => perm)

  const utilizationRate = (usedPermissions.size / grantedPermissions.length) * 100

  const recommendations = []

  // Recommendation 1: Remove unused permissions
  for (const perm of grantedPermissions) {
    if (!usedPermissions.has(perm)) {
      const daysSinceLastUse = await getDaysSinceLastUse(userId, perm)

      if (daysSinceLastUse > 60) {
        recommendations.push({
          type: 'remove',
          permission: perm,
          reason: `Not used in ${daysSinceLastUse} days`,
          impact: 'low',
          confidenceScore: 85
        })
      }
    }
  }

  // Recommendation 2: Grant frequently attempted permissions
  const { data: deniedAttempts } = await supabase
    .from('permission_audit_log')
    .select('permission_denied')
    .eq('user_id', userId)
    .not('permission_denied', 'is', null)
    .gte('created_at', subDays(new Date(), lookbackDays).toISOString())

  const deniedCount = deniedAttempts.reduce((acc, log) => {
    acc[log.permission_denied] = (acc[log.permission_denied] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  for (const [perm, count] of Object.entries(deniedCount)) {
    if (count > 5) {
      recommendations.push({
        type: 'add',
        permission: perm,
        reason: `Attempted ${count} times but denied`,
        impact: 'medium',
        confidenceScore: 70
      })
    }
  }

  // Recommendation 3: Role upgrade/downgrade
  const optimalRole = await findOptimalRole(usedPermissions)
  if (optimalRole && optimalRole !== currentRole) {
    recommendations.push({
      type: 'role_change',
      suggestedRole: optimalRole,
      reason: `Better match for usage pattern (${Math.round(optimalRole.matchScore * 100)}% match)`,
      impact: 'high',
      confidenceScore: optimalRole.matchScore * 100
    })
  }

  return {
    recommendations: recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore),
    currentUtilization: utilizationRate,
    projectedUtilization: await calculateProjectedUtilization(
      grantedPermissions,
      recommendations.filter(r => r.type === 'remove')
    )
  }
}

// Find optimal role based on permission usage
async function findOptimalRole(usedPermissions: Set<string>) {
  const allRoles = [...Object.keys(ROLE_PERMISSIONS), ...(await getCustomRoles())]

  let bestMatch = null
  let bestScore = 0

  for (const role of allRoles) {
    const rolePerms = getRolePermissions(role)
    const rolePerm Keys = Object.entries(rolePerms)
      .filter(([_, granted]) => granted)
      .map(([perm, _]) => perm)

    // Calculate Jaccard similarity
    const intersection = rolePermKeys.filter(p => usedPermissions.has(p)).length
    const union = new Set([...rolePermKeys, ...Array.from(usedPermissions)]).size
    const similarity = intersection / union

    if (similarity > bestScore) {
      bestScore = similarity
      bestMatch = { role, matchScore: similarity }
    }
  }

  return bestScore > 0.7 ? bestMatch : null
}
```

**Recommendation UI**:
```typescript
export default function PermissionRecommendations({ userId }: { userId: string }) {
  const [analysis, setAnalysis] = useState<any>(null)

  useEffect(() => {
    analyzeAndRecommend()
  }, [])

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">AI Recommendations 🤖</h3>

      {/* Utilization meter */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Permission Utilization</span>
          <span className="text-2xl font-bold">
            {Math.round(analysis?.currentUtilization || 0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${analysis?.currentUtilization || 0}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Using {Math.round(analysis?.currentUtilization || 0)} of granted permissions
        </p>
      </div>

      {/* Recommendations list */}
      <div className="space-y-3">
        {analysis?.recommendations.map((rec: any, idx: number) => (
          <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {rec.type === 'remove' && <MinusCircle className="w-5 h-5 text-red-500" />}
                {rec.type === 'add' && <PlusCircle className="w-5 h-5 text-green-500" />}
                {rec.type === 'role_change' && <RefreshCw className="w-5 h-5 text-blue-500" />}

                <span className="font-semibold capitalize">
                  {rec.type === 'role_change' ? 'Change Role' : `${rec.type} Permission`}
                </span>
              </div>

              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                {rec.confidenceScore}% confidence
              </span>
            </div>

            <p className="text-sm text-gray-700 mb-3">{rec.reason}</p>

            {rec.permission && (
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {rec.permission}
              </code>
            )}

            {rec.suggestedRole && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm">Suggested role:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {rec.suggestedRole.role}
                </span>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleApplyRecommendation(rec)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={() => handleDismissRecommendation(rec)}
                className="px-3 py-2 border rounded text-sm hover:bg-gray-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Business Value**:
- 🎯 Optimize permissions based on actual usage
- 📉 Reduce unused permissions by 60%
- 🤖 Continuous AI-driven improvements
- ✅ Better security posture

---

### 19. Voice-Controlled Role Management ⭐⭐⭐⭐⭐

**What**: Manage roles and permissions using voice commands (e.g., "Add John to the safety team with photo upload access")

**Why**:
- Hands-free operation on job sites
- Faster than typing on mobile
- Accessibility for users with disabilities
- Modern, futuristic UX

**How It Works**:
```typescript
// Voice command processor using Web Speech API + OpenAI
export class VoiceRoleManager {
  private recognition: SpeechRecognition
  private synthesis: SpeechSynthesis

  constructor() {
    this.recognition = new (window as any).webkitSpeechRecognition()
    this.recognition.continuous = false
    this.recognition.interimResults = false
    this.recognition.lang = 'en-US'

    this.synthesis = window.speechSynthesis
  }

  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        resolve(transcript)
      }

      this.recognition.onerror = (event: any) => {
        reject(event.error)
      }

      this.recognition.start()
    })
  }

  async processCommand(transcript: string): Promise<VoiceCommandResult> {
    // Use OpenAI to parse intent
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Parse voice commands for role management. Extract:
- action (add_member, remove_member, change_role, create_role, list_roles)
- target_user (name or email)
- role (role name)
- permissions (optional list)

Respond in JSON:
{
  "action": "...",
  "target_user": "...",
  "role": "...",
  "permissions": [...],
  "confidence": 0.95
}`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content)

    // Execute command
    if (result.confidence < 0.7) {
      return {
        success: false,
        message: `Sorry, I'm not confident about that command (${Math.round(result.confidence * 100)}% confidence). Can you rephrase?`
      }
    }

    switch (result.action) {
      case 'add_member':
        await this.addTeamMember(result.target_user, result.role)
        return {
          success: true,
          message: `Added ${result.target_user} as ${result.role}`
        }

      case 'change_role':
        await this.changeUserRole(result.target_user, result.role)
        return {
          success: true,
          message: `Changed ${result.target_user}'s role to ${result.role}`
        }

      case 'list_roles':
        const roles = await this.listRoles()
        return {
          success: true,
          message: `Available roles: ${roles.join(', ')}`,
          data: roles
        }

      default:
        return {
          success: false,
          message: `I don't know how to ${result.action}`
        }
    }
  }

  speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    this.synthesis.speak(utterance)
  }
}
```

**Voice UI Component**:
```typescript
export default function VoiceRoleAssistant() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [history, setHistory] = useState<VoiceCommand[]>([])

  const voiceManager = useRef(new VoiceRoleManager())

  const handleVoiceCommand = async () => {
    try {
      setIsListening(true)
      setTranscript('Listening...')

      // Listen for command
      const command = await voiceManager.current.startListening()
      setTranscript(command)

      // Process command
      const result = await voiceManager.current.processCommand(command)
      setResponse(result.message)

      // Speak response
      voiceManager.current.speak(result.message)

      // Add to history
      setHistory([
        ...history,
        {
          timestamp: new Date(),
          command,
          result: result.message,
          success: result.success
        }
      ])
    } catch (error) {
      setResponse('Sorry, I didn't catch that. Try again?')
      voiceManager.current.speak('Sorry, I didn't catch that')
    } finally {
      setIsListening(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Voice Assistant 🎤</h2>
        <p className="text-gray-600">
          Try: "Add Sarah to the inspection team" or "List all roles"
        </p>
      </div>

      {/* Voice button */}
      <div className="flex justify-center">
        <button
          onClick={handleVoiceCommand}
          disabled={isListening}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-red-500 animate-pulse scale-110'
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
          }`}
        >
          {isListening ? (
            <Mic className="w-16 h-16 text-white" />
          ) : (
            <MicOff className="w-16 h-16 text-white" />
          )}
        </button>
      </div>

      {/* Transcript display */}
      {transcript && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-1">You said:</p>
          <p className="text-lg text-blue-800">"{transcript}"</p>
        </div>
      )}

      {/* Response display */}
      {response && (
        <div className={`border rounded-lg p-4 ${
          response.includes('Sorry') || response.includes('not')
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <p className="text-sm font-medium mb-1">Assistant:</p>
          <p className="text-lg">{response}</p>
        </div>
      )}

      {/* Command history */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Recent Commands</h3>
          {history.slice(-5).reverse().map((cmd, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded border"
            >
              {cmd.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cmd.command}</p>
                <p className="text-xs text-gray-600">{cmd.result}</p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatDistanceToNow(cmd.timestamp)} ago
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Example commands */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="font-semibold text-sm mb-2">Try these commands:</p>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• "Add John Smith as a project manager"</li>
          <li>• "Change Sarah's role to superintendent"</li>
          <li>• "Remove Mike from the team"</li>
          <li>• "Create a role for quality inspectors"</li>
          <li>• "List all team members"</li>
          <li>• "Show me the admin role permissions"</li>
        </ul>
      </div>
    </div>
  )
}
```

**Business Value**:
- 🎤 Hands-free operation on job sites
- ⚡ 3x faster than manual entry
- ♿ Improved accessibility
- 🚀 Cutting-edge user experience

---

### 20. Automated Compliance Reporting ⭐⭐⭐

**What**: Generate compliance reports automatically (SOC 2, ISO 27001, GDPR)

**Why**:
- Save hundreds of hours on audits
- Automated evidence collection
- Always audit-ready
- Regulatory compliance

**How It Works**:
```typescript
// Compliance report generator
export async function generateComplianceReport(
  companyId: string,
  standard: 'soc2' | 'iso27001' | 'gdpr',
  reportingPeriod: { start: Date; end: Date }
): Promise<ComplianceReport> {
  const report: ComplianceReport = {
    standard,
    period: reportingPeriod,
    generatedAt: new Date(),
    findings: [],
    score: 0,
    recommendations: []
  }

  switch (standard) {
    case 'soc2':
      return await generateSOC2Report(companyId, reportingPeriod)

    case 'iso27001':
      return await generateISO27001Report(companyId, reportingPeriod)

    case 'gdpr':
      return await generateGDPRReport(companyId, reportingPeriod)
  }
}

// SOC 2 specific checks
async function generateSOC2Report(
  companyId: string,
  period: { start: Date; end: Date }
): Promise<ComplianceReport> {
  const findings = []

  // CC6.1: Logical access controls
  const accessControls = await checkAccessControls(companyId)
  findings.push({
    control: 'CC6.1 - Logical Access Controls',
    status: accessControls.rlsEnabled ? 'pass' : 'fail',
    evidence: [
      `RLS policies: ${accessControls.rlsPolicies.length} active`,
      `MFA enabled: ${accessControls.mfaEnabled}`,
      `Password policy: ${accessControls.passwordPolicy}`
    ],
    recommendations: accessControls.rlsEnabled ? [] : [
      'Enable Row-Level Security on all tables',
      'Implement MFA for all users'
    ]
  })

  // CC6.2: User access management
  const userAccess = await analyzeUserAccessManagement(companyId, period)
  findings.push({
    control: 'CC6.2 - User Access Management',
    status: userAccess.score > 80 ? 'pass' : 'fail',
    evidence: [
      `Access reviews conducted: ${userAccess.reviewCount}`,
      `Orphaned accounts: ${userAccess.orphanedAccounts}`,
      `Over-privileged users: ${userAccess.overPrivilegedCount}`
    ],
    recommendations: [
      `Conduct quarterly access reviews`,
      `Remove ${userAccess.orphanedAccounts} inactive accounts`,
      `Review permissions for ${userAccess.overPrivilegedCount} users`
    ]
  })

  // CC6.3: Access removal
  const accessRemoval = await checkAccessRemovalProcesses(companyId, period)
  findings.push({
    control: 'CC6.3 - Timely Access Removal',
    status: accessRemoval.avgRemovalTime < 24 ? 'pass' : 'fail',
    evidence: [
      `Avg removal time: ${accessRemoval.avgRemovalTime} hours`,
      `Removals in period: ${accessRemoval.totalRemovals}`,
      `Automated removals: ${accessRemoval.automatedPercentage}%`
    ],
    recommendations: accessRemoval.avgRemovalTime < 24 ? [] : [
      'Implement automated role expiration',
      'Set up real-time deprovisioning'
    ]
  })

  // CC7.2: Audit logging
  const auditLogging = await checkAuditLogging(companyId, period)
  findings.push({
    control: 'CC7.2 - System Monitoring',
    status: auditLogging.coverage > 95 ? 'pass' : 'fail',
    evidence: [
      `Audit log coverage: ${auditLogging.coverage}%`,
      `Log retention: ${auditLogging.retentionDays} days`,
      `Total events logged: ${auditLogging.eventCount}`
    ],
    recommendations: []
  })

  // Calculate overall score
  const passCount = findings.filter(f => f.status === 'pass').length
  const score = (passCount / findings.length) * 100

  return {
    standard: 'soc2',
    period,
    generatedAt: new Date(),
    findings,
    score,
    recommendations: findings.flatMap(f => f.recommendations),
    summary: {
      totalControls: findings.length,
      passed: passCount,
      failed: findings.length - passCount,
      complianceLevel: score > 90 ? 'excellent' : score > 75 ? 'good' : 'needs improvement'
    }
  }
}
```

**Compliance Dashboard**:
```typescript
export default function ComplianceDashboard({ companyId }: { companyId: string }) {
  const [selectedStandard, setSelectedStandard] = useState<'soc2' | 'iso27001' | 'gdpr'>('soc2')
  const [report, setReport] = useState<ComplianceReport | null>(null)

  const generateReport = async () => {
    const reportData = await generateComplianceReport(
      companyId,
      selectedStandard,
      {
        start: subMonths(new Date(), 3),
        end: new Date()
      }
    )
    setReport(reportData)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Compliance Reporting</h2>

      {/* Standard selector */}
      <div className="grid grid-cols-3 gap-4">
        {(['soc2', 'iso27001', 'gdpr'] as const).map(standard => (
          <button
            key={standard}
            onClick={() => setSelectedStandard(standard)}
            className={`p-4 border-2 rounded-lg ${
              selectedStandard === standard
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300'
            }`}
          >
            <p className="font-semibold text-lg">
              {standard.toUpperCase().replace('SOC2', 'SOC 2')}
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={generateReport}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Generate {selectedStandard.toUpperCase()} Report
      </button>

      {/* Report results */}
      {report && (
        <div className="space-y-6">
          {/* Score card */}
          <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Compliance Score</p>
                <p className="text-5xl font-bold mt-2">{Math.round(report.score)}%</p>
                <p className="mt-2 capitalize">{report.summary.complianceLevel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  {report.summary.passed}/{report.summary.totalControls} controls passed
                </p>
                <p className="text-xs mt-1 opacity-75">
                  Period: {format(report.period.start, 'MMM d')} - {format(report.period.end, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Control Findings</h3>

            {report.findings.map((finding, idx) => (
              <div key={idx} className={`border-l-4 rounded-lg p-4 ${
                finding.status === 'pass'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {finding.status === 'pass' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold">{finding.control}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    finding.status === 'pass'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-red-200 text-red-800'
                  }`}>
                    {finding.status.toUpperCase()}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Evidence:</p>
                  <ul className="text-sm space-y-1">
                    {finding.evidence.map((ev, i) => (
                      <li key={i}>• {ev}</li>
                    ))}
                  </ul>
                </div>

                {finding.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Recommendations:</p>
                    <ul className="text-sm space-y-1">
                      {finding.recommendations.map((rec, i) => (
                        <li key={i}>💡 {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Export button */}
          <button
            onClick={() => exportReportToPDF(report)}
            className="w-full px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export PDF Report
          </button>
        </div>
      )}
    </div>
  )
}
```

**Business Value**:
- ⏱️ Save 100+ hours per audit
- ✅ Always audit-ready
- 📊 Automated evidence collection
- 🔒 Regulatory compliance

---

## Tier 5: Game-Changing Features

Implementation: 3-6 months each | Revolutionary, industry-first features

### 21. Permission Marketplace ⭐⭐⭐⭐⭐

**What**: Community-driven marketplace where companies can share, sell, or purchase custom role templates

**Why**:
- Crowdsourced industry best practices
- Monetization opportunity
- Network effects
- Industry-specific expertise

**How It Works**:
```typescript
// Marketplace data structure
interface RoleMarketplaceListing {
  id: string
  role_template: CustomRole
  author_company_id: string
  author_name: string
  industry: string[]
  tags: string[]
  description: string
  price: number // 0 for free
  downloads: number
  rating: number
  reviews: Review[]
  is_verified: boolean
  created_at: string
  updated_at: string
}

// Marketplace API
// app/api/marketplace/roles/route.ts

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const industry = searchParams.get('industry')
  const tags = searchParams.get('tags')?.split(',')
  const sort = searchParams.get('sort') || 'popular'

  let query = supabase
    .from('role_marketplace')
    .select('*, reviews(rating)')

  if (industry) query = query.contains('industry', [industry])
  if (tags) query = query.overlaps('tags', tags)

  // Sort options
  switch (sort) {
    case 'popular':
      query = query.order('downloads', { ascending: false })
      break
    case 'rating':
      query = query.order('rating', { ascending: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
  }

  const { data: listings } = await query

  return NextResponse.json({ listings })
}

// Purchase/download role template
export async function POST(req: NextRequest) {
  const { listingId } = await req.json()

  // Get listing
  const { data: listing } = await supabase
    .from('role_marketplace')
    .select('*')
    .eq('id', listingId)
    .single()

  // Process payment if not free
  if (listing.price > 0) {
    await processPayment(userId, listing.price, listingId)
  }

  // Clone role template to user's company
  const clonedRole = await customRolesService.createCustomRole(
    companyId,
    listing.role_template.role_name,
    listing.role_template.permissions,
    {
      description: `${listing.role_template.description} (from marketplace)`,
      color: listing.role_template.color,
      icon: listing.role_template.icon
    }
  )

  // Increment download count
  await supabase
    .from('role_marketplace')
    .update({ downloads: listing.downloads + 1 })
    .eq('id', listingId)

  return NextResponse.json({ role: clonedRole })
}
```

**Marketplace UI**:
```typescript
export default function RoleMarketplace() {
  const [listings, setListings] = useState<RoleMarketplaceListing[]>([])
  const [filters, setFilters] = useState({
    industry: 'all',
    priceRange: 'all',
    sort: 'popular'
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Marketplace</h2>
          <p className="text-gray-600">
            Discover and download role templates from the community
          </p>
        </div>

        <button
          onClick={() => router.push('/marketplace/publish')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Publish Your Role
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filters.industry}
          onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Industries</option>
          <option value="commercial">Commercial Construction</option>
          <option value="residential">Residential</option>
          <option value="industrial">Industrial</option>
        </select>

        <select
          value={filters.priceRange}
          onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Prices</option>
          <option value="free">Free Only</option>
          <option value="paid">Paid Only</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Listings grid */}
      <div className="grid grid-cols-3 gap-6">
        {listings.map(listing => (
          <div key={listing.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {/* Role preview */}
            <div
              className="h-32 p-6 flex items-center justify-center"
              style={{ backgroundColor: listing.role_template.color + '20' }}
            >
              <span className="text-6xl">{listing.role_template.icon}</span>
            </div>

            <div className="p-6">
              {/* Title and rating */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">
                  {listing.role_template.role_name}
                </h3>
                {listing.is_verified && (
                  <span className="text-blue-600" title="Verified by BuildCo">
                    <CheckCircle className="w-5 h-5" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(listing.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-600">
                  ({listing.reviews.length} reviews)
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {listing.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {listing.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between mb-4 text-xs text-gray-600">
                <span>{listing.downloads} downloads</span>
                <span>
                  {Object.values(listing.role_template.permissions).filter(Boolean).length} permissions
                </span>
              </div>

              {/* Price and download */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {listing.price === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `$${listing.price}`
                  )}
                </span>

                <button
                  onClick={() => handleDownload(listing.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {listing.price === 0 ? 'Download' : 'Purchase'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Business Value**:
- 💰 New revenue stream (marketplace fees)
- 🌐 Network effects
- 🚀 Faster customer onboarding
- 🏆 Industry leadership

---

### 22. Certification-Based Auto-Permissions ⭐⭐⭐⭐⭐

**What**: Automatically grant permissions based on uploaded certifications (e.g., OSHA badge grants safety permissions)

**Why**:
- Credential verification
- Automatic role assignment
- Compliance automation
- Trust & safety

**How It Works**:
```typescript
// Certification processor using OCR + verification
export async function processCertificationUpload(
  userId: string,
  certificationFile: File
): Promise<CertificationResult> {
  // 1. Extract text from certificate using OCR
  const formData = new FormData()
  formData.append('file', certificationFile)

  const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'apikey': process.env.OCR_API_KEY },
    body: formData
  })
  const ocrData = await ocrResponse.json()
  const extractedText = ocrData.ParsedResults[0].ParsedText

  // 2. Identify certification type using AI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Analyze construction industry certification text and extract:
- certification_type (OSHA30, OSHA10, PMP, PE, etc.)
- holder_name
- certification_number
- issue_date
- expiry_date
- issuing_authority

Respond in JSON format.`
      },
      {
        role: 'user',
        content: extractedText
      }
    ],
    response_format: { type: 'json_object' }
  })

  const certData = JSON.parse(completion.choices[0].message.content)

  // 3. Verify certification with issuing authority API
  const isValid = await verifyCertification(
    certData.certification_type,
    certData.certification_number,
    certData.issuing_authority
  )

  if (!isValid) {
    return {
      success: false,
      error: 'Certification could not be verified'
    }
  }

  // 4. Map certification to permissions
  const grantedPermissions = CERTIFICATION_PERMISSION_MAP[certData.certification_type]

  // 5. Create or update user's role
  if (grantedPermissions) {
    await grantPermissionsBasedOnCertification(
      userId,
      certData.certification_type,
      grantedPermissions,
      certData.expiry_date
    )
  }

  // 6. Store certification record
  await supabase.from('user_certifications').insert({
    user_id: userId,
    certification_type: certData.certification_type,
    certification_number: certData.certification_number,
    holder_name: certData.holder_name,
    issue_date: certData.issue_date,
    expiry_date: certData.expiry_date,
    issuing_authority: certData.issuing_authority,
    verified_at: new Date(),
    file_url: await uploadCertificationFile(certificationFile)
  })

  return {
    success: true,
    certification: certData,
    grantedPermissions
  }
}

// Certification to permission mapping
const CERTIFICATION_PERMISSION_MAP: Record<string, Partial<PermissionSet>> = {
  'OSHA30': {
    canViewAllProjects: true,
    canManagePunchList: true,
    canResolvePunchItems: true,
    canUploadPhotos: true,
    canUploadDocuments: true,
    canShareDocuments: true
  },
  'PMP': {
    canViewAllProjects: true,
    canEditProjects: true,
    canCreateProjects: true,
    canManageTasks: true,
    canAssignTasks: true,
    canViewAllTasks: true,
    canViewAnalytics: true,
    canViewReports: true
  },
  'PE': { // Professional Engineer
    canViewAllProjects: true,
    canEditProjects: true,
    canViewAnalytics: true,
    canViewReports: true,
    canUploadDocuments: true,
    canShareDocuments: true,
    canManageTasks: true
  },
  'CPA': { // Certified Public Accountant
    canManageFinances: true,
    canApproveExpenses: true,
    canViewFinancials: true,
    canViewAnalytics: true,
    canExportData: true,
    canViewReports: true
  }
}

// Auto-verification with issuing authorities
async function verifyCertification(
  type: string,
  number: string,
  authority: string
): Promise<boolean> {
  // Integration with certification databases
  switch (authority.toLowerCase()) {
    case 'osha':
      return await verifyOSHACertification(number)

    case 'pmi':
      return await verifyPMICertification(number)

    case 'ncees':
      return await verifyPELicense(number)

    default:
      // Manual review required
      return false
  }
}
```

**Certification Upload UI**:
```typescript
export default function CertificationUploader({ userId }: { userId: string }) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<CertificationResult | null>(null)

  const handleFileUpload = async (file: File) => {
    setUploading(true)

    try {
      const result = await processCertificationUpload(userId, file)
      setResult(result)

      if (result.success) {
        toast.success(`Certification verified! ${Object.keys(result.grantedPermissions).length} permissions granted.`)
      }
    } catch (error) {
      toast.error('Failed to process certification')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Upload Professional Certifications</h3>

      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
          id="cert-upload"
        />

        <label
          htmlFor="cert-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          {uploading ? (
            <>
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Processing certification...</p>
              <p className="text-xs text-gray-500 mt-2">Verifying with issuing authority</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium mb-2">
                Upload OSHA, PMP, PE, or other professional certificates
              </p>
              <p className="text-xs text-gray-500">
                Supported: JPEG, PNG, PDF • Auto-verified • Permissions granted automatically
              </p>
            </>
          )}
        </label>
      </div>

      {/* Result display */}
      {result && result.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />

            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-2">
                Certification Verified! ✅
              </h4>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-green-700 font-medium">Type:</p>
                  <p className="text-green-900">{result.certification.certification_type}</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Number:</p>
                  <p className="text-green-900">{result.certification.certification_number}</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Expires:</p>
                  <p className="text-green-900">
                    {format(new Date(result.certification.expiry_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Authority:</p>
                  <p className="text-green-900">{result.certification.issuing_authority}</p>
                </div>
              </div>

              <div className="bg-white rounded p-3">
                <p className="text-sm font-medium text-green-900 mb-2">
                  Permissions Granted:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.grantedPermissions)
                    .filter(([_, granted]) => granted)
                    .map(([perm, _]) => (
                      <span
                        key={perm}
                        className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                      >
                        {perm.replace(/^can/, '')}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supported certifications */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="font-medium text-sm mb-2">Supported Certifications:</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <div>• OSHA 30-Hour</div>
          <div>• OSHA 10-Hour</div>
          <div>• PMP (Project Management Professional)</div>
          <div>• PE (Professional Engineer)</div>
          <div>• CPA (Certified Public Accountant)</div>
          <div>• CCM (Certified Construction Manager)</div>
          <div>• LEED AP</div>
          <div>• More coming soon...</div>
        </div>
      </div>
    </div>
  )
}
```

**Business Value**:
- 🎓 Automated credential verification
- ⚡ Instant permission granting
- ✅ Compliance automation
- 🔒 Trust & safety

---

### 23. Blockchain-Based Audit Trail ⭐⭐⭐⭐⭐

**What**: Immutable, tamper-proof audit log using blockchain technology

**Why**:
- Legal compliance
- Immutable records
- Cryptographic verification
- Ultimate trust & transparency

**How It Works**:
```typescript
// Blockchain integration using Ethereum/Polygon
import { ethers } from 'ethers'

// Smart contract for audit logging
const AuditLogContract = `
pragma solidity ^0.8.0;

contract RBACauditLog {
    struct AuditEntry {
        string userId;
        string action;
        string resourceType;
        string resourceId;
        string permissionGranted;
        string permissionDenied;
        uint256 timestamp;
        bytes32 dataHash;
    }

    AuditEntry[] public entries;

    event AuditEntryCreated(
        uint256 indexed entryId,
        string userId,
        string action,
        uint256 timestamp
    );

    function createAuditEntry(
        string memory userId,
        string memory action,
        string memory resourceType,
        string memory resourceId,
        string memory permissionGranted,
        string memory permissionDenied,
        bytes32 dataHash
    ) public returns (uint256) {
        uint256 entryId = entries.length;

        entries.push(AuditEntry({
            userId: userId,
            action: action,
            resourceType: resourceType,
            resourceId: resourceId,
            permissionGranted: permissionGranted,
            permissionDenied: permissionDenied,
            timestamp: block.timestamp,
            dataHash: dataHash
        }));

        emit AuditEntryCreated(entryId, userId, action, block.timestamp);

        return entryId;
    }

    function verifyEntry(uint256 entryId, bytes32 expectedHash) public view returns (bool) {
        require(entryId < entries.length, "Entry does not exist");
        return entries[entryId].dataHash == expectedHash;
    }

    function getEntry(uint256 entryId) public view returns (AuditEntry memory) {
        require(entryId < entries.length, "Entry does not exist");
        return entries[entryId];
    }
}
`

// Service to log to blockchain
export class BlockchainAuditService {
  private provider: ethers.Provider
  private wallet: ethers.Wallet
  private contract: ethers.Contract

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL)
    this.wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, this.provider)
    this.contract = new ethers.Contract(
      process.env.AUDIT_CONTRACT_ADDRESS,
      AuditLogABI,
      this.wallet
    )
  }

  async logToBlockchain(auditEntry: AuditLogEntry): Promise<string> {
    // 1. Create hash of audit data
    const dataHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(auditEntry))
    )

    // 2. Submit to blockchain
    const tx = await this.contract.createAuditEntry(
      auditEntry.user_id,
      auditEntry.action,
      auditEntry.resource_type,
      auditEntry.resource_id,
      auditEntry.permission_granted || '',
      auditEntry.permission_denied || '',
      dataHash
    )

    // 3. Wait for confirmation
    const receipt = await tx.wait()

    // 4. Return transaction hash
    return receipt.hash
  }

  async verifyAuditEntry(
    blockchainTxHash: string,
    localAuditEntry: AuditLogEntry
  ): Promise<boolean> {
    // 1. Get transaction from blockchain
    const tx = await this.provider.getTransaction(blockchainTxHash)
    if (!tx) return false

    // 2. Decode transaction data
    const decodedData = this.contract.interface.decodeFunctionData(
      'createAuditEntry',
      tx.data
    )

    // 3. Verify all fields match
    return (
      decodedData.userId === localAuditEntry.user_id &&
      decodedData.action === localAuditEntry.action &&
      decodedData.resourceType === localAuditEntry.resource_type &&
      decodedData.resourceId === localAuditEntry.resource_id
    )
  }
}

// Enhanced audit logging with blockchain
export async function logAuditEntryWithBlockchain(entry: AuditLogEntry) {
  // 1. Log to database (fast, queryable)
  const { data: dbEntry } = await supabase
    .from('permission_audit_log')
    .insert(entry)
    .select()
    .single()

  // 2. Log to blockchain (slow, immutable)
  const blockchainService = new BlockchainAuditService()
  const txHash = await blockchainService.logToBlockchain(entry)

  // 3. Update database with blockchain reference
  await supabase
    .from('permission_audit_log')
    .update({ blockchain_tx_hash: txHash })
    .eq('id', dbEntry.id)

  return { dbEntry, txHash }
}
```

**Blockchain Verification UI**:
```typescript
export default function BlockchainAuditVerifier() {
  const [txHash, setTxHash] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleVerify = async () => {
    setVerifying(true)

    try {
      // Get local audit entry
      const { data: localEntry } = await supabase
        .from('permission_audit_log')
        .select('*')
        .eq('blockchain_tx_hash', txHash)
        .single()

      if (!localEntry) {
        setResult({
          verified: false,
          error: 'No local entry found for this transaction'
        })
        return
      }

      // Verify on blockchain
      const blockchainService = new BlockchainAuditService()
      const isValid = await blockchainService.verifyAuditEntry(txHash, localEntry)

      // Get blockchain transaction details
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL)
      const tx = await provider.getTransaction(txHash)
      const receipt = await provider.getTransactionReceipt(txHash)

      setResult({
        verified: isValid,
        localEntry,
        blockNumber: receipt.blockNumber,
        timestamp: await getBlockTimestamp(receipt.blockNumber),
        confirmations: receipt.confirmations,
        gasUsed: receipt.gasUsed.toString()
      })
    } catch (error) {
      setResult({
        verified: false,
        error: error.message
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Blockchain Audit Verification</h3>

      {/* Input */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Transaction Hash
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
            className="flex-1 px-4 py-2 border rounded-lg font-mono text-sm"
          />
          <button
            onClick={handleVerify}
            disabled={!txHash || verifying}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`border-2 rounded-lg p-6 ${
          result.verified
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {result.verified ? (
              <>
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h4 className="font-bold text-green-900">Verified on Blockchain ✅</h4>
                  <p className="text-sm text-green-700">This audit entry is authentic and immutable</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <h4 className="font-bold text-red-900">Verification Failed ❌</h4>
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              </>
            )}
          </div>

          {result.verified && (
            <div className="space-y-3">
              {/* Blockchain details */}
              <div className="bg-white rounded p-4">
                <p className="text-sm font-medium mb-3">Blockchain Details:</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Block Number:</p>
                    <p className="font-mono">{result.blockNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Confirmations:</p>
                    <p className="font-mono">{result.confirmations}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Timestamp:</p>
                    <p className="font-mono">
                      {format(new Date(result.timestamp * 1000), 'MMM d, yyyy HH:mm:ss')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Gas Used:</p>
                    <p className="font-mono">{result.gasUsed}</p>
                  </div>
                </div>
              </div>

              {/* Audit entry details */}
              <div className="bg-white rounded p-4">
                <p className="text-sm font-medium mb-3">Audit Entry:</p>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">User:</span>
                    <span className="font-medium">{result.localEntry.user_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Action:</span>
                    <span className="font-medium">{result.localEntry.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resource:</span>
                    <span className="font-medium">
                      {result.localEntry.resource_type} ({result.localEntry.resource_id})
                    </span>
                  </div>
                </div>
              </div>

              {/* View on explorer */}
              <a
                href={`https://polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View on Block Explorer →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Business Value**:
- 🔒 Cryptographically secure audit trail
- ⚖️ Legal compliance & admissibility
- 🛡️ Ultimate tamper-proof records
- 🌐 Industry-first blockchain RBAC

---

### 24. Multi-Company Federation ⭐⭐⭐⭐⭐

**What**: Share roles and permissions across multiple companies (parent company + subsidiaries)

**Why**:
- Enterprise groups with multiple entities
- Franchise operations
- Holding companies
- Centralized governance

**How It Works**:
```typescript
// Federation schema
interface CompanyFederation {
  id: string
  parent_company_id: string
  member_company_ids: string[]
  federation_name: string
  shared_roles: string[] // Role IDs that are shared
  role_override_policy: 'parent_wins' | 'child_can_override' | 'merge'
  created_at: string
}

// Federated permission resolution
export async function getFederatedUserPermissions(
  userId: string,
  companyId: string
): Promise<PermissionSet> {
  // 1. Get local permissions
  const localPerms = await getUserPermissions(userId)

  // 2. Check if company is part of federation
  const { data: federation } = await supabase
    .from('company_federations')
    .select('*')
    .or(`parent_company_id.eq.${companyId},member_company_ids.cs.{${companyId}}`)
    .single()

  if (!federation) {
    return localPerms // Not federated
  }

  // 3. Get shared roles from parent
  if (federation.parent_company_id !== companyId) {
    const { data: sharedRoles } = await supabase
      .from('custom_roles')
      .select('*')
      .eq('company_id', federation.parent_company_id)
      .in('id', federation.shared_roles)

    // 4. Resolve conflicts based on policy
    return resolveFederatedPermissions(
      localPerms,
      sharedRoles,
      federation.role_override_policy
    )
  }

  return localPerms
}

// Conflict resolution strategies
function resolveFederatedPermissions(
  localPerms: PermissionSet,
  sharedRoles: CustomRole[],
  policy: string
): PermissionSet {
  const sharedPerms = mergePermissionsFromRoles(sharedRoles)

  switch (policy) {
    case 'parent_wins':
      // Parent permissions override local
      return { ...localPerms, ...sharedPerms }

    case 'child_can_override':
      // Local permissions override parent
      return { ...sharedPerms, ...localPerms }

    case 'merge':
      // Grant permission if either parent or local grants it
      return Object.keys(localPerms).reduce((merged, key) => {
        merged[key as keyof PermissionSet] =
          localPerms[key as keyof PermissionSet] ||
          sharedPerms[key as keyof PermissionSet]
        return merged
      }, {} as PermissionSet)
  }
}

// API to create federation
// app/api/federations/route.ts

export async function POST(req: NextRequest) {
  const {
    memberCompanyIds,
    federationName,
    sharedRoles,
    overridePolicy
  } = await req.json()

  // Verify requester is admin of parent company
  const isParentAdmin = await checkIsCompanyAdmin(userId, companyId)
  if (!isParentAdmin) {
    return NextResponse.json({ error: 'Only parent company admins can create federations' }, { status: 403 })
  }

  // Create federation
  const { data: federation } = await supabase
    .from('company_federations')
    .insert({
      parent_company_id: companyId,
      member_company_ids: memberCompanyIds,
      federation_name: federationName,
      shared_roles: sharedRoles,
      role_override_policy: overridePolicy
    })
    .select()
    .single()

  // Notify member companies
  for (const memberCompanyId of memberCompanyIds) {
    await notifyCompanyOfFederation(memberCompanyId, federation)
  }

  return NextResponse.json({ federation }, { status: 201 })
}
```

**Federation Management UI**:
```typescript
export default function FederationManager({ companyId, isParent }: Props) {
  const [federation, setFederation] = useState<CompanyFederation | null>(null)
  const [memberCompanies, setMemberCompanies] = useState<Company[]>([])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Company Federation</h2>

      {isParent ? (
        <>
          {/* Parent company view */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">
              You are the parent company in this federation
            </h3>

            {/* Member companies */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Member Companies:</p>
              {memberCompanies.map(company => (
                <div key={company.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-xs text-gray-600">
                      {company.member_count} team members
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveFromFederation(company.id)}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Shared roles */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Roles Shared with Members:</p>
              <div className="grid grid-cols-2 gap-2">
                {federation?.shared_roles.map(roleId => {
                  const role = customRoles.find(r => r.id === roleId)
                  return (
                    <div key={roleId} className="flex items-center gap-2 p-2 bg-white rounded border">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ backgroundColor: role?.color }}
                      >
                        {role?.icon}
                      </div>
                      <span className="text-sm">{role?.role_name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Override policy */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">
                Permission Override Policy:
              </label>
              <select
                value={federation?.role_override_policy}
                onChange={(e) => handleUpdatePolicy(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="parent_wins">Parent Wins (strict control)</option>
                <option value="child_can_override">Child Can Override (flexible)</option>
                <option value="merge">Merge (grant if either allows)</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Member company view */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">
              You are a member of "{federation?.federation_name}"
            </h3>

            <p className="text-sm text-gray-700 mb-4">
              Parent company: {federation?.parent_company.name}
            </p>

            <div className="bg-white rounded p-4">
              <p className="text-sm font-medium mb-3">
                Roles inherited from parent:
              </p>
              {/* Display inherited roles */}
            </div>

            {federation?.role_override_policy === 'child_can_override' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  ℹ️ You can create local roles that override parent roles
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
```

**Business Value**:
- 🏢 Enterprise-grade multi-company management
- 🔄 Centralized governance across entities
- 💼 Perfect for holding companies & franchises
- ⚡ Scalable to hundreds of companies

---

### 25. Predictive Permission Analytics ⭐⭐⭐⭐⭐

**What**: ML-powered predictions for future permission needs, security risks, and optimization opportunities

**Why**:
- Proactive security management
- Predict future staffing needs
- Optimize role configurations
- Stay ahead of issues

**How It Works**:
```typescript
// Predictive analytics using TensorFlow.js
import * as tf from '@tensorflow/tfjs'

export class PermissionPredictionEngine {
  private model: tf.LayersModel | null = null

  async trainModel(companyId: string) {
    // 1. Gather historical data
    const trainingData = await this.prepareTrainingData(companyId)

    // 2. Build neural network
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [30], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 30, activation: 'sigmoid' }) // 30 permissions
      ]
    })

    // 3. Compile model
    this.model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })

    // 4. Train
    await this.model.fit(trainingData.inputs, trainingData.outputs, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2
    })

    // 5. Save model
    await this.model.save(`indexeddb://permission-model-${companyId}`)
  }

  async predictFuturePermissions(userId: string, projectId?: string) {
    if (!this.model) {
      throw new Error('Model not trained')
    }

    // Get user's current behavior pattern
    const behaviorVector = await this.getUserBehaviorVector(userId)

    // Predict what permissions they'll need
    const prediction = this.model.predict(tf.tensor2d([behaviorVector])) as tf.Tensor
    const predictions = await prediction.array()

    // Convert to permission recommendations
    const permissionNames = Object.keys(DEFAULT_PERMISSIONS)
    const recommendations = permissionNames
      .map((perm, idx) => ({
        permission: perm,
        probability: predictions[0][idx],
        currentlyGranted: await hasPermission(userId, perm)
      }))
      .filter(r => !r.currentlyGranted && r.probability > 0.7)
      .sort((a, b) => b.probability - a.probability)

    return recommendations
  }

  async predictSecurityRisks(companyId: string) {
    // Analyze patterns to predict security issues
    const { data: members } = await supabase
      .from('team_members')
      .select('*, permission_audit_log(*)')
      .eq('company_id', companyId)

    const risks = []

    for (const member of members) {
      // Pattern 1: Rapid permission escalation
      const recentGrants = member.permission_audit_log
        .filter(log => log.action === 'role_changed')
        .filter(log => isWithinDays(log.created_at, 30))

      if (recentGrants.length > 3) {
        risks.push({
          type: 'rapid_escalation',
          user: member,
          probability: 0.85,
          message: `User received ${recentGrants.length} role changes in 30 days`,
          recommendation: 'Review permission changes for anomalies'
        })
      }

      // Pattern 2: Unusual activity patterns
      const activityPattern = await analyzeActivityPattern(member.user_id)
      if (activityPattern.anomalyScore > 0.8) {
        risks.push({
          type: 'unusual_activity',
          user: member,
          probability: activityPattern.anomalyScore,
          message: 'Activity pattern deviates from historical behavior',
          recommendation: 'Investigate recent activity'
        })
      }
    }

    return risks
  }

  async predictOptimizationOpportunities(companyId: string) {
    const opportunities = []

    // Opportunity 1: Underutilized roles
    const roleUtilization = await analyzeRoleUtilization(companyId)

    for (const [role, utilization] of Object.entries(roleUtilization)) {
      if (utilization.avgUsagePercent < 30) {
        opportunities.push({
          type: 'underutilized_role',
          role,
          impact: 'medium',
          message: `${role} members use only ${utilization.avgUsagePercent}% of their permissions`,
          recommendation: `Consider downgrading ${utilization.memberCount} members to a lower role`,
          estimatedSavings: utilization.memberCount * 0.15 // Security risk reduction
        })
      }
    }

    // Opportunity 2: Role consolidation
    const similarRoles = await findSimilarRoles(companyId)

    for (const pair of similarRoles) {
      if (pair.similarity > 0.9) {
        opportunities.push({
          type: 'role_consolidation',
          roles: [pair.role1, pair.role2],
          impact: 'high',
          message: `${pair.role1} and ${pair.role2} are ${Math.round(pair.similarity * 100)}% similar`,
          recommendation: 'Consolidate into single role for easier management',
          estimatedSavings: 0.2 // Management overhead reduction
        })
      }
    }

    return opportunities
  }

  private async prepareTrainingData(companyId: string) {
    // Convert historical audit logs to training vectors
    const { data: logs } = await supabase
      .from('permission_audit_log')
      .select('*')
      .eq('company_id', companyId)
      .limit(10000)

    const inputs = []
    const outputs = []

    for (const log of logs) {
      const userPerms = await getUserPermissionsAtTime(log.user_id, log.created_at)
      inputs.push(Object.values(userPerms).map(p => p ? 1 : 0))

      const futurePerms = await getUserPermissionsAtTime(
        log.user_id,
        addDays(log.created_at, 30)
      )
      outputs.push(Object.values(futurePerms).map(p => p ? 1 : 0))
    }

    return {
      inputs: tf.tensor2d(inputs),
      outputs: tf.tensor2d(outputs)
    }
  }
}
```

**Predictive Analytics Dashboard**:
```typescript
export default function PredictiveAnalytics({ companyId }: { companyId: string }) {
  const [predictions, setPredictions] = useState<any>(null)
  const [risks, setRisks] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([])

  const engine = useRef(new PermissionPredictionEngine())

  useEffect(() => {
    runPredictions()
  }, [])

  const runPredictions = async () => {
    // Train model (first time only)
    await engine.current.trainModel(companyId)

    // Get predictions
    const predictedRisks = await engine.current.predictSecurityRisks(companyId)
    const predictedOpps = await engine.current.predictOptimizationOpportunities(companyId)

    setRisks(predictedRisks)
    setOpportunities(predictedOpps)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Predictive Analytics 🔮</h2>

      {/* Predicted Security Risks */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Predicted Security Risks</h3>

        {risks.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="font-semibold text-green-900">No predicted risks</p>
            <p className="text-sm text-green-700 mt-1">Your permission security looks great!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {risks.map((risk, idx) => (
              <div key={idx} className="border-l-4 border-red-500 bg-red-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">{risk.type.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                  <span className="px-3 py-1 bg-white rounded-full text-xs font-medium">
                    {Math.round(risk.probability * 100)}% probability
                  </span>
                </div>

                <p className="text-sm text-red-800 mb-2">{risk.message}</p>
                <p className="text-xs text-red-700">💡 {risk.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optimization Opportunities */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Optimization Opportunities</h3>

        <div className="space-y-3">
          {opportunities.map((opp, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="font-semibold text-blue-900">
                  {opp.type.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium capitalize">
                  {opp.impact} impact
                </span>
              </div>

              <p className="text-sm text-blue-800 mb-2">{opp.message}</p>
              <p className="text-xs text-blue-700 mb-3">💡 {opp.recommendation}</p>

              {opp.estimatedSavings && (
                <p className="text-xs text-blue-600">
                  Est. security improvement: {Math.round(opp.estimatedSavings * 100)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Business Value**:
- 🔮 Predict future permission needs
- 🛡️ Proactive security risk detection
- 📊 Data-driven optimization
- 🚀 Stay ahead of issues

---

## Implementation Priority Matrix

This matrix helps prioritize which enhancements to implement first based on **Impact** vs **Effort**.

### Quick Wins (High Impact, Low Effort) 🚀
**Implement These First**

1. **Role Templates Library** (⭐) - 1 week
2. **Permission Presets** (⭐) - 1 week
3. **Export/Import Roles** (⭐) - 1 week
4. **Bulk Role Assignment** (⭐) - 1 week
5. **Permission Analytics Dashboard** (⭐⭐) - 2 weeks

**Total: 6 weeks | ROI: 400%**

### Major Projects (High Impact, High Effort) 💎
**Plan These for Quarters 2-3**

6. **Natural Language Role Creation** (⭐⭐⭐⭐⭐) - 3 months
7. **AI Permission Conflict Detection** (⭐⭐⭐⭐) - 2 months
8. **Permission Recommendation Engine** (⭐⭐⭐⭐) - 2 months
9. **Project-Specific Overrides** (⭐⭐⭐) - 1 month
10. **Approval Workflows** (⭐⭐⭐) - 1 month

**Total: 9 months | ROI: 250%**

### Fill-Ins (Low Impact, Low Effort) 📝
**Nice to Have, Implement When Capacity Allows**

11. **Role Comparison View** (⭐⭐) - 2 weeks
12. **Time-Limited Access** (⭐⭐) - 2 weeks
13. **Smart Permission Suggestions** (⭐⭐) - 3 weeks

**Total: 7 weeks | ROI: 150%**

### Strategic Investments (Variable Impact, High Effort) 🎯
**Long-term Competitive Advantages**

14. **Permission Marketplace** (⭐⭐⭐⭐⭐) - 6 months
15. **Blockchain Audit Trail** (⭐⭐⭐⭐⭐) - 4 months
16. **Multi-Company Federation** (⭐⭐⭐⭐⭐) - 5 months
17. **Certification Auto-Permissions** (⭐⭐⭐⭐⭐) - 4 months
18. **Predictive Analytics** (⭐⭐⭐⭐⭐) - 5 months

**Total: 24 months | ROI: Transformational**

### Experimental (Low Impact, High Effort) 🧪
**Only If Strategic Alignment**

19. **Voice-Controlled Management** (⭐⭐⭐⭐⭐) - 4 months
20. **Visual Drag-&-Drop Builder** (⭐⭐⭐) - 2 months

**Total: 6 months | ROI: 80% (niche use cases)**

---

## Recommended Implementation Roadmap

### Year 1: Foundation & Quick Wins

**Q1 (Months 1-3):**
- ✅ MVP Already Deployed
- ✓ Role Templates Library
- ✓ Permission Presets
- ✓ Export/Import Roles
- ✓ Bulk Role Assignment
- ✓ Permission Analytics Dashboard

**Q2 (Months 4-6):**
- Project-Specific Overrides
- Time-Limited Access
- Role Comparison View
- Approval Workflows (start)

**Q3 (Months 7-9):**
- AI Permission Conflict Detection
- Smart Permission Suggestions
- Permission Recommendation Engine
- Approval Workflows (finish)

**Q4 (Months 10-12):**
- Activity-Based Access Control
- Role Delegation
- Permission Inheritance
- Multi-Tenant Isolation Hardening

### Year 2: Advanced Features & AI

**Q1 (Months 13-15):**
- Natural Language Role Creation
- Automated Compliance Reporting
- Enhanced Audit Analytics

**Q2 (Months 16-18):**
- Certification Auto-Permissions
- Visual Role Builder (if customer demand)
- Voice Controls (if strategic fit)

**Q3 (Months 19-21):**
- Permission Marketplace (Phase 1: Free templates)
- Multi-Company Federation (for enterprise)

**Q4 (Months 22-24):**
- Predictive Permission Analytics
- Permission Marketplace (Phase 2: Paid listings)
- Blockchain Audit Trail (for regulated industries)

---

## Success Metrics

### MVP (Already Deployed) ✅

**Quantitative:**
- ✓ <50ms permission check latency (p95)
- ✓ 7 built-in roles available
- ✓ 30 granular permissions
- ✓ Zero breaking changes
- ✓ 100% RLS coverage

**Qualitative:**
- ✓ Positive user feedback
- ✓ No security incidents
- ✓ Clear audit trail

### Post-Enhancement KPIs (Year 1)

**Adoption Metrics:**
- Custom role creation rate: 5+ roles per company
- Role template downloads: 10+ per company
- Permission preset usage: 50%+ of role creations
- Bulk assignment usage: 30%+ of role changes

**Efficiency Gains:**
- Role configuration time: -70% (from 30min to 9min)
- Permission change processing: -60% (bulk operations)
- Audit compliance time: -80% (automated reports)

**Security Improvements:**
- Permission conflicts detected: 90%+ reduction
- Over-privileged users: -50%
- Inactive accounts with permissions: -90%
- Average time to revoke access: <2 hours

### Advanced Features KPIs (Year 2)

**AI Performance:**
- NLP role creation accuracy: >85%
- Permission recommendation acceptance rate: >60%
- Security risk prediction accuracy: >75%
- False positive rate: <15%

**Marketplace Metrics:**
- Role templates published: 100+
- Template downloads: 1,000+
- Average template rating: >4.0/5.0
- Revenue from marketplace: $10K+/month

**Enterprise Adoption:**
- Companies using federation: 20+
- Companies using blockchain audit: 10+
- Certification-based auto-permissions: 50+ users
- Multi-factor compliance reporting: 15+ companies

### Ultimate Success Criteria

**Market Leadership:**
- ✓ First construction SaaS with NLP role creation
- ✓ First with blockchain RBAC audit trail
- ✓ Largest permission template marketplace in industry
- ✓ Highest permission security score (measured by auditors)

**Customer Impact:**
- ✓ 90% reduction in permission configuration time
- ✓ Zero permission-related security breaches
- ✓ 100% audit compliance
- ✓ Featured in industry compliance best practices

**Business Impact:**
- ✓ Marketplace becomes revenue center ($100K+/year)
- ✓ Enterprise tier pricing justified by federation features
- ✓ Competitive moat from AI features
- ✓ Industry thought leadership

---

## Conclusion

This document outlines **25 future enhancements** for Module 10 (Teams & RBAC), organized into 5 tiers from quick wins to game-changing innovations.

**Key Takeaways:**

1. **Start with Quick Wins** - Implement Tier 1 enhancements first (6 weeks, 400% ROI)
2. **Build AI Capabilities** - Tier 4 AI features create competitive moat
3. **Strategic Differentiation** - Tier 5 features (marketplace, blockchain, federation) establish market leadership
4. **Customer-Driven** - Prioritize based on customer feedback and usage patterns
5. **Measured Progress** - Track metrics at each tier to validate impact

**Next Steps:**

1. Review this document with product team
2. Gather customer feedback on top 10 priorities
3. Create detailed specs for Tier 1 (Quick Wins)
4. Allocate engineering resources for Q1 implementation
5. Set up analytics tracking for success metrics

**Remember:**
- Module 10 MVP is already production-ready ✅
- These enhancements build on solid foundation
- Implement incrementally based on customer needs
- Each tier adds significant value independently
- Aim for continuous improvement, not perfection

---

**Document Complete**

**Total Enhancements Documented**: 25
**Total Lines of Code Examples**: 4,000+
**Estimated Total Implementation Time**: 24 months
**Potential Business Impact**: Transformational

For questions about specific enhancements, refer to the detailed implementation sections above, or contact the development team.

🎉 **Module 10 is ready to evolve into the industry's most advanced RBAC system!**



