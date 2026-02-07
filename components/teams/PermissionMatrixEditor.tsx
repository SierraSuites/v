'use client'

import { useState } from 'react'
import { PermissionSet } from '@/lib/permissions'
import {
  CheckCircle2,
  Circle,
  Folder,
  Users,
  Camera,
  BarChart3,
  Sparkles,
  CheckSquare,
  ClipboardList,
  DollarSign,
  FileText,
  Settings
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface PermissionMatrixEditorProps {
  initialPermissions: PermissionSet
  onChange: (permissions: PermissionSet) => void
  readOnly?: boolean
}

interface PermissionGroup {
  name: string
  icon: React.ReactNode
  color: string
  permissions: {
    key: keyof PermissionSet
    label: string
    description: string
  }[]
}

// ============================================
// PERMISSION GROUPS CONFIGURATION
// ============================================

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Projects',
    icon: <Folder className="w-5 h-5" />,
    color: 'text-blue-600',
    permissions: [
      {
        key: 'canViewAllProjects',
        label: 'View All Projects',
        description: 'See all company projects, not just assigned ones'
      },
      {
        key: 'canEditProjects',
        label: 'Edit Projects',
        description: 'Modify project details, budgets, and schedules'
      },
      {
        key: 'canCreateProjects',
        label: 'Create Projects',
        description: 'Create new projects'
      },
      {
        key: 'canDeleteProjects',
        label: 'Delete Projects',
        description: 'Permanently delete projects'
      }
    ]
  },
  {
    name: 'Team Management',
    icon: <Users className="w-5 h-5" />,
    color: 'text-purple-600',
    permissions: [
      {
        key: 'canManageTeam',
        label: 'Manage Team',
        description: 'Full team management including roles and permissions'
      },
      {
        key: 'canInviteMembers',
        label: 'Invite Members',
        description: 'Send invitations to new team members'
      },
      {
        key: 'canRemoveMembers',
        label: 'Remove Members',
        description: 'Remove team members from teams'
      },
      {
        key: 'canChangeRoles',
        label: 'Change Roles',
        description: 'Modify team member roles and permissions'
      }
    ]
  },
  {
    name: 'Photos & Media',
    icon: <Camera className="w-5 h-5" />,
    color: 'text-green-600',
    permissions: [
      {
        key: 'canViewAllPhotos',
        label: 'View All Photos',
        description: 'See all project photos, not just shared ones'
      },
      {
        key: 'canUploadPhotos',
        label: 'Upload Photos',
        description: 'Upload new photos and media'
      },
      {
        key: 'canDeletePhotos',
        label: 'Delete Photos',
        description: 'Delete photos and media'
      },
      {
        key: 'canSharePhotos',
        label: 'Share Photos',
        description: 'Share photos with team members or clients'
      },
      {
        key: 'canEditPhotoMetadata',
        label: 'Edit Photo Metadata',
        description: 'Edit photo tags, descriptions, and categories'
      }
    ]
  },
  {
    name: 'Analytics & Reports',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'text-orange-600',
    permissions: [
      {
        key: 'canViewAnalytics',
        label: 'View Analytics',
        description: 'Access analytics dashboards and insights'
      },
      {
        key: 'canExportData',
        label: 'Export Data',
        description: 'Export reports and data to CSV/PDF'
      },
      {
        key: 'canViewReports',
        label: 'View Reports',
        description: 'Access generated reports and summaries'
      }
    ]
  },
  {
    name: 'AI Features',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-pink-600',
    permissions: [
      {
        key: 'canManageAI',
        label: 'Manage AI',
        description: 'Configure AI settings and integrations'
      },
      {
        key: 'canRunAIAnalysis',
        label: 'Run AI Analysis',
        description: 'Trigger AI analysis on photos and documents'
      },
      {
        key: 'canViewAIInsights',
        label: 'View AI Insights',
        description: 'See AI-generated insights and recommendations'
      }
    ]
  },
  {
    name: 'Task Management',
    icon: <CheckSquare className="w-5 h-5" />,
    color: 'text-indigo-600',
    permissions: [
      {
        key: 'canManageTasks',
        label: 'Manage Tasks',
        description: 'Create, edit, and delete tasks'
      },
      {
        key: 'canAssignTasks',
        label: 'Assign Tasks',
        description: 'Assign tasks to team members'
      },
      {
        key: 'canViewAllTasks',
        label: 'View All Tasks',
        description: 'See all tasks, not just assigned ones'
      }
    ]
  },
  {
    name: 'Punch List',
    icon: <ClipboardList className="w-5 h-5" />,
    color: 'text-red-600',
    permissions: [
      {
        key: 'canManagePunchList',
        label: 'Manage Punch List',
        description: 'Create and manage punch list items'
      },
      {
        key: 'canResolvePunchItems',
        label: 'Resolve Items',
        description: 'Mark punch list items as resolved'
      },
      {
        key: 'canViewPunchList',
        label: 'View Punch List',
        description: 'See punch list items'
      }
    ]
  },
  {
    name: 'Financial',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'text-emerald-600',
    permissions: [
      {
        key: 'canManageFinances',
        label: 'Manage Finances',
        description: 'Full access to financial management'
      },
      {
        key: 'canApproveExpenses',
        label: 'Approve Expenses',
        description: 'Review and approve expense reports'
      },
      {
        key: 'canViewFinancials',
        label: 'View Financials',
        description: 'See financial data and reports'
      }
    ]
  },
  {
    name: 'Documents',
    icon: <FileText className="w-5 h-5" />,
    color: 'text-amber-600',
    permissions: [
      {
        key: 'canUploadDocuments',
        label: 'Upload Documents',
        description: 'Upload files and documents'
      },
      {
        key: 'canDeleteDocuments',
        label: 'Delete Documents',
        description: 'Delete files and documents'
      },
      {
        key: 'canShareDocuments',
        label: 'Share Documents',
        description: 'Share documents with team or clients'
      }
    ]
  },
  {
    name: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    color: 'text-gray-600',
    permissions: [
      {
        key: 'canManageCompanySettings',
        label: 'Manage Company Settings',
        description: 'Modify company-wide settings'
      },
      {
        key: 'canManageIntegrations',
        label: 'Manage Integrations',
        description: 'Configure third-party integrations'
      }
    ]
  }
]

// ============================================
// COMPONENT
// ============================================

export default function PermissionMatrixEditor({
  initialPermissions,
  onChange,
  readOnly = false
}: PermissionMatrixEditorProps) {
  const [permissions, setPermissions] = useState<PermissionSet>(initialPermissions)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(PERMISSION_GROUPS.map(g => g.name))
  )

  const togglePermission = (key: keyof PermissionSet) => {
    if (readOnly) return

    const newPermissions = {
      ...permissions,
      [key]: !permissions[key]
    }
    setPermissions(newPermissions)
    onChange(newPermissions)
  }

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName)
    } else {
      newExpanded.add(groupName)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleAllInGroup = (group: PermissionGroup, enable: boolean) => {
    if (readOnly) return

    const newPermissions = { ...permissions }
    group.permissions.forEach(perm => {
      newPermissions[perm.key] = enable
    })
    setPermissions(newPermissions)
    onChange(newPermissions)
  }

  const getGroupEnabledCount = (group: PermissionGroup): number => {
    return group.permissions.filter(perm => permissions[perm.key]).length
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Permissions Summary</h3>
            <p className="text-sm text-gray-500 mt-1">
              {Object.values(permissions).filter(Boolean).length} of {Object.keys(permissions).length} permissions enabled
            </p>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const allEnabled = Object.fromEntries(
                    Object.keys(permissions).map(key => [key, true])
                  ) as unknown as PermissionSet
                  setPermissions(allEnabled)
                  onChange(allEnabled)
                }}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                Enable All
              </button>
              <button
                onClick={() => {
                  const allDisabled = Object.fromEntries(
                    Object.keys(permissions).map(key => [key, false])
                  ) as unknown as PermissionSet
                  setPermissions(allDisabled)
                  onChange(allDisabled)
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Disable All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Permission Groups */}
      <div className="space-y-3">
        {PERMISSION_GROUPS.map(group => {
          const isExpanded = expandedGroups.has(group.name)
          const enabledCount = getGroupEnabledCount(group)
          const totalCount = group.permissions.length

          return (
            <div key={group.name} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={group.color}>{group.icon}</div>
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-gray-900">{group.name}</h4>
                    <p className="text-xs text-gray-500">
                      {enabledCount} of {totalCount} enabled
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <div className="flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAllInGroup(group, true)
                        }}
                        className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
                      >
                        All
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAllInGroup(group, false)
                        }}
                        className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                      >
                        None
                      </button>
                    </div>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Permissions List */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {group.permissions.map(perm => (
                    <button
                      key={perm.key}
                      onClick={() => togglePermission(perm.key)}
                      disabled={readOnly}
                      className={`w-full flex items-start gap-3 p-4 border-b border-gray-100 last:border-b-0 transition-colors ${
                        readOnly
                          ? 'cursor-default'
                          : 'hover:bg-gray-100 cursor-pointer'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {permissions[perm.key] ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-medium ${
                          permissions[perm.key] ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {perm.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
