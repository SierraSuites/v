"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import { UnauthorizedAccess } from '@/components/auth/PermissionGate'
import TeamManager from '@/components/teams/TeamManager'
import UserRoleBadge from '@/components/users/UserRoleBadge'
import PermissionMatrixEditor from '@/components/teams/PermissionMatrixEditor'
import CreateCustomRoleModal from '@/components/teams/CreateCustomRoleModal'
import AuditLogViewer from '@/components/teams/AuditLogViewer'
import { ROLE_PERMISSIONS, UserRole, getRoleDisplayName, getRoleColor, getRoleIcon } from '@/lib/permissions'
import { Users, Shield, Mail, FileText, Plus } from 'lucide-react'
import { useThemeColors } from "@/lib/hooks/useThemeColors"

export default function TeamsPage() {
  const router = useRouter()
  const { colors, darkMode } = useThemeColors()
  const { hasPermission, role, userId, loading: permissionsLoading } = usePermissions()
  const [user, setUser] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('members')
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false)
  const [customRoles, setCustomRoles] = useState<any[]>([])
  const [selectedRoleForView, setSelectedRoleForView] = useState<string | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (companyId && activeTab === 'roles') {
      loadCustomRoles()
    }
  }, [companyId, activeTab])

  const loadUser = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user: authUser }, error } = await supabase.auth.getUser()

      if (error || !authUser) {
        router.push('/login')
        return
      }

      setUser(authUser)

      // Get company ID from user metadata or from database
      const company_id = authUser.user_metadata?.company_id

      if (company_id) {
        setCompanyId(company_id)
      } else {
        // Try to get from profile or create
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', authUser.id)
          .single()

        if (profile?.company_id) {
          setCompanyId(profile.company_id)
        }
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomRoles = async () => {
    try {
      const response = await fetch('/api/roles')
      const data = await response.json()

      if (response.ok) {
        setCustomRoles(data.customRoles || [])
      }
    } catch (error) {
      console.error('Error loading custom roles:', error)
    }
  }

  const handleCreateRoleSuccess = () => {
    loadCustomRoles()
  }

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bgAlt }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: colors.textMuted }}>Loading teams...</p>
        </div>
      </div>
    )
  }

  // Check permissions
  const canManageTeam = hasPermission('canManageTeam')
  const canInviteMembers = hasPermission('canInviteMembers')

  if (!canManageTeam && !canInviteMembers) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: colors.bgAlt }}>
        <div className="max-w-7xl mx-auto p-6">
          <UnauthorizedAccess
            message="You need admin or superintendent permissions to manage teams"
            actionText="Back to Dashboard"
            onAction={() => router.push('/dashboard')}
          />
        </div>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: colors.bgAlt }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">🏢</span>
            <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>No Company Found</h3>
            <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
              You need to be part of a company to manage teams
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'members', label: 'Team Members', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    ...(canManageTeam ? [{ id: 'audit', label: 'Audit Log', icon: FileText }] : [])
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bgAlt }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: colors.bg, borderColor: darkMode ? '#2d3548' : '#E0E0E0' }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Team Management</h1>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  Manage your teams, members, roles, and permissions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {userId && <UserRoleBadge userId={userId} role={role} size="md" />}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b" style={{ borderColor: darkMode ? '#2d3548' : '#E0E0E0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Team Members Tab */}
        {activeTab === 'members' && (
          <>
            {/* Permission Info */}
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#E5F4FF', border: '1px solid #BFDBFE' }}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: '#1E40AF' }}>
                    Your Permissions
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: '#1E40AF' }}>
                    {canManageTeam && <li>✓ Can manage teams (create, edit, delete)</li>}
                    {canInviteMembers && <li>✓ Can invite and remove members</li>}
                    {hasPermission('canChangeRoles') && <li>✓ Can change member roles</li>}
                    {hasPermission('canViewAllProjects') && <li>✓ Can view all projects</li>}
                  </ul>
                </div>
              </div>
            </div>

            {/* Team Manager Component */}
            <TeamManager companyId={companyId} />
          </>
        )}

        {/* Roles & Permissions Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            {/* Header with Create Button */}
            {canManageTeam && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Roles & Permissions</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage built-in and custom roles for your organization
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateRoleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Custom Role
                </button>
              </div>
            )}

            {/* Built-in Roles */}
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-4">Built-in Roles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(ROLE_PERMISSIONS).map(roleKey => {
                  const roleTyped = roleKey as UserRole
                  const isSelected = selectedRoleForView === roleKey

                  return (
                    <div key={roleKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setSelectedRoleForView(isSelected ? null : roleKey)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                          style={{ backgroundColor: getRoleColor(roleTyped) + '20' }}
                        >
                          {getRoleIcon(roleTyped)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900">{getRoleDisplayName(roleTyped)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {Object.values(ROLE_PERMISSIONS[roleTyped]).filter(Boolean).length} of 30 permissions
                          </p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isSelected && (
                        <div className="border-t border-gray-200 p-4">
                          <PermissionMatrixEditor
                            initialPermissions={ROLE_PERMISSIONS[roleTyped]}
                            onChange={() => {}}
                            readOnly={true}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Custom Roles */}
            {customRoles.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Custom Roles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customRoles.map(customRole => {
                    const isSelected = selectedRoleForView === customRole.id

                    return (
                      <div key={customRole.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setSelectedRoleForView(isSelected ? null : customRole.id)}
                          className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                            style={{ backgroundColor: customRole.color }}
                          >
                            {customRole.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900">{customRole.role_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {customRole.member_count || 0} members · {Object.values(customRole.permissions).filter(Boolean).length} permissions
                            </p>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isSelected && (
                          <div className="border-t border-gray-200 p-4">
                            {customRole.description && (
                              <p className="text-sm text-gray-600 mb-4">{customRole.description}</p>
                            )}
                            <PermissionMatrixEditor
                              initialPermissions={customRole.permissions}
                              onChange={() => {}}
                              readOnly={true}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && canManageTeam && (
          <AuditLogViewer companyId={companyId} />
        )}
      </main>

      {/* Create Custom Role Modal */}
      <CreateCustomRoleModal
        isOpen={showCreateRoleModal}
        onClose={() => setShowCreateRoleModal(false)}
        onSuccess={handleCreateRoleSuccess}
      />
    </div>
  )
}
