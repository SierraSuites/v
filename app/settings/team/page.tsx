'use client'

import { useState } from 'react'
import { Users, History } from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import TeamDirectory from '@/components/teams/TeamDirectory'
import InviteTeamMember from '@/components/teams/InviteTeamMember'
import UserRoleEditor from '@/components/teams/UserRoleEditor'
import AuditLogViewer from '@/components/teams/AuditLogViewer'

type ActiveTab = 'directory' | 'audit-logs'

export default function TeamSettingsPage() {
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  const { colors, darkMode } = useThemeColors()
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showRoleEditor, setShowRoleEditor] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('')

  const handleEditMember = (memberId: string) => {
    setSelectedUserId(memberId)
    setShowRoleEditor(true)
  }

  if (userLoading) {
    return (
      <div className="px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded w-48" style={{ backgroundColor: colors.bgMuted }} />
          <div className="h-64 rounded-lg" style={{ backgroundColor: colors.bg }} />
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="px-8 py-8 text-center" style={{ color: colors.textMuted }}>
        <p>You need to be signed in to view this page.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="px-8 pt-8 pb-0">
        <h1 className="text-xl font-bold mb-1" style={{ color: colors.text }}>Team & Roles</h1>
        <p className="text-sm" style={{ color: colors.textMuted }}>
          Manage your team members, roles, and permissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="px-8 mt-4 border-b" style={{ borderColor: darkMode ? '#2d3548' : '#E0E0E0' }}>
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('directory')}
            className="flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition-colors"
            style={{
              borderColor: activeTab === 'directory' ? '#3b82f6' : 'transparent',
              color: activeTab === 'directory' ? '#3b82f6' : colors.textMuted,
            }}
          >
            <Users className="w-4 h-4" />
            Team Directory
          </button>

          {currentUser.permissions.canViewAnalytics && (
            <button
              onClick={() => setActiveTab('audit-logs')}
              className="flex items-center gap-2 py-3 border-b-2 font-medium text-sm transition-colors"
              style={{
                borderColor: activeTab === 'audit-logs' ? '#3b82f6' : 'transparent',
                color: activeTab === 'audit-logs' ? '#3b82f6' : colors.textMuted,
              }}
            >
              <History className="w-4 h-4" />
              Audit Logs
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 flex-1">
        {activeTab === 'directory' && (
          <TeamDirectory
            onInviteMember={() => setShowInviteModal(true)}
            onEditMember={handleEditMember}
          />
        )}

        {activeTab === 'audit-logs' && currentUser.company_id && (
          <AuditLogViewer companyId={currentUser.company_id} />
        )}
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteTeamMember
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            window.location.reload()
          }}
        />
      )}

      {showRoleEditor && selectedUserId && (
        <UserRoleEditor
          userId={selectedUserId}
          userName={selectedUserName}
          userEmail={selectedUserEmail}
          onClose={() => {
            setShowRoleEditor(false)
            setSelectedUserId(null)
          }}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  )
}
