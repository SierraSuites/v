'use client'

import { useState } from 'react'
import { Users, Shield, History, Settings as SettingsIcon } from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import TeamDirectory from '@/components/teams/TeamDirectory'
import InviteTeamMember from '@/components/teams/InviteTeamMember'
import UserRoleEditor from '@/components/teams/UserRoleEditor'
import AuditLogViewer from '@/components/teams/AuditLogViewer'

// ============================================
// TYPES
// ============================================

type ActiveTab = 'directory' | 'audit-logs'

// ============================================
// COMPONENT
// ============================================

export default function TeamSettingsPage() {
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showRoleEditor, setShowRoleEditor] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('')

  // Handle edit member
  const handleEditMember = (memberId: string) => {
    // In a real implementation, you'd fetch the user details
    // For now, we'll just open the modal with the ID
    setSelectedUserId(memberId)
    setShowRoleEditor(true)
  }

  // Loading state
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // No access
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Team Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your team members, roles, and permissions
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('directory')}
              className={`
                pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'directory'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team Directory
              </div>
            </button>

            {currentUser.permissions.canViewAnalytics && (
              <button
                onClick={() => setActiveTab('audit-logs')}
                className={`
                  pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === 'audit-logs'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Audit Logs
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Team Management Best Practices
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Assign roles based on job responsibilities and required access levels</li>
                <li>• Regularly review team member roles and permissions</li>
                <li>• Use temporary role assignments for contractors or temporary staff</li>
                <li>• Enable audit logs to track all permission changes</li>
                <li>• Deactivate users immediately when they leave the organization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteTeamMember
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            // Refresh the team directory
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
          onSuccess={() => {
            // Refresh the team directory
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
