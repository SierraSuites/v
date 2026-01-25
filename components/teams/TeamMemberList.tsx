"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type TeamMember,
  type UserRole,
  permissionService,
  getRoleDisplayName,
  getRoleColor,
  getRoleIcon,
  canManageRole
} from '@/lib/permissions'

interface TeamMemberListProps {
  teamId: string
  canManage: boolean
  onMemberUpdated?: () => void
}

export default function TeamMemberList({ teamId, canManage, onMemberUpdated }: TeamMemberListProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('viewer')
  const [updatingMember, setUpdatingMember] = useState<string | null>(null)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'field_engineer' as UserRole
  })
  const [inviting, setInviting] = useState(false)

  // Load members
  const loadMembers = async () => {
    try {
      setLoading(true)
      const teamMembers = await permissionService.getTeamMembers(teamId)
      setMembers(teamMembers)

      // Get current user's role
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const userMember = teamMembers.find(m => m.user_id === user.id)
        if (userMember) {
          setCurrentUserRole(userMember.role)
        }
      }
    } catch (err) {
      console.error('Error loading team members:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [teamId])

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    try {
      setUpdatingMember(memberId)
      const supabase = createClient()

      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      await loadMembers()
      onMemberUpdated?.()
    } catch (err) {
      console.error('Error updating role:', err)
      alert('Failed to update role')
    } finally {
      setUpdatingMember(null)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      setUpdatingMember(memberId)
      const supabase = createClient()

      const { error } = await supabase
        .from('team_members')
        .update({ removed_at: new Date().toISOString() })
        .eq('id', memberId)

      if (error) throw error

      await loadMembers()
      onMemberUpdated?.()
    } catch (err) {
      console.error('Error removing member:', err)
      alert('Failed to remove member')
    } finally {
      setUpdatingMember(null)
    }
  }

  const handleToggleLead = async (memberId: string, currentIsLead: boolean) => {
    try {
      setUpdatingMember(memberId)
      const supabase = createClient()

      const { error } = await supabase
        .from('team_members')
        .update({ is_lead: !currentIsLead })
        .eq('id', memberId)

      if (error) throw error

      await loadMembers()
      onMemberUpdated?.()
    } catch (err) {
      console.error('Error toggling lead status:', err)
      alert('Failed to update lead status')
    } finally {
      setUpdatingMember(null)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteForm.email.trim() || !inviteForm.email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }

    try {
      setInviting(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('Not authenticated')
        return
      }

      // Generate invitation token
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      // Create invitation
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email: inviteForm.email.toLowerCase(),
          role: inviteForm.role,
          invited_by: user.id,
          invitation_token: token,
          expires_at: expiresAt.toISOString()
        })

      if (error) throw error

      // TODO: Send invitation email via API route

      setInviteForm({ email: '', role: 'field_engineer' })
      setShowInviteModal(false)
      alert('Invitation sent successfully!')
    } catch (err) {
      console.error('Error inviting member:', err)
      alert('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#FF6B6B' }} />
        <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Loading members...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
          Team Members ({members.length})
        </h4>
        {canManage && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 rounded-lg border font-semibold text-sm transition-colors hover:bg-gray-50"
            style={{ borderColor: '#E5E7EB', color: '#374151' }}
          >
            ➕ Invite Member
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {members.map(member => (
          <div
            key={member.id}
            className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
          >
            {/* Member Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                style={{ backgroundColor: getRoleColor(member.role) }}
              >
                {member.user?.email?.[0].toUpperCase() || '?'}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate" style={{ color: '#1A1A1A' }}>
                    {member.user?.user_metadata?.full_name || member.user?.email || 'Unknown User'}
                  </p>
                  {member.is_lead && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                      ⭐ Lead
                    </span>
                  )}
                </div>
                <p className="text-sm truncate" style={{ color: '#6B7280' }}>
                  {member.user?.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: `${getRoleColor(member.role)}20`,
                      color: getRoleColor(member.role)
                    }}
                  >
                    {getRoleIcon(member.role)} {getRoleDisplayName(member.role)}
                  </span>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    Joined {new Date(member.added_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {canManage && canManageRole(currentUserRole, member.role) && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Role Dropdown */}
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                  className="px-3 py-1 rounded-lg border text-sm font-semibold focus:outline-none focus:ring-2"
                  style={{
                    borderColor: '#E5E7EB',
                    color: getRoleColor(member.role)
                  }}
                  disabled={updatingMember === member.id}
                >
                  <option value="admin">👑 Admin</option>
                  <option value="superintendent">🏗️ Superintendent</option>
                  <option value="project_manager">📋 Project Manager</option>
                  <option value="field_engineer">🔧 Field Engineer</option>
                  <option value="viewer">👁️ Viewer</option>
                </select>

                {/* Lead Toggle */}
                <button
                  onClick={() => handleToggleLead(member.id, member.is_lead)}
                  className="p-2 rounded-lg border transition-colors hover:bg-white"
                  style={{ borderColor: '#E5E7EB' }}
                  title={member.is_lead ? 'Remove lead' : 'Make lead'}
                  disabled={updatingMember === member.id}
                >
                  {member.is_lead ? '⭐' : '☆'}
                </button>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-2 rounded-lg border transition-colors hover:bg-red-50"
                  style={{ borderColor: '#FEE2E2', color: '#DC2626' }}
                  title="Remove member"
                  disabled={updatingMember === member.id}
                >
                  🗑️
                </button>
              </div>
            )}

            {/* Loading Overlay */}
            {updatingMember === member.id && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#FF6B6B' }} />
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: '#6B7280' }}>
              No team members yet. Invite your first member!
            </p>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
                  ✉️ Invite Team Member
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-2xl hover:opacity-70"
                  style={{ color: '#6B7280' }}
                  disabled={inviting}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E5E7EB' }}
                  disabled={inviting}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E5E7EB' }}
                  disabled={inviting}
                >
                  <option value="admin">👑 Administrator</option>
                  <option value="superintendent">🏗️ Superintendent</option>
                  <option value="project_manager">📋 Project Manager</option>
                  <option value="field_engineer">🔧 Field Engineer</option>
                  <option value="viewer">👁️ Viewer</option>
                </select>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  {inviteForm.role === 'admin' && 'Full system access and team management'}
                  {inviteForm.role === 'superintendent' && 'Manage projects, teams, and all photos'}
                  {inviteForm.role === 'project_manager' && 'Manage assigned projects and tasks'}
                  {inviteForm.role === 'field_engineer' && 'Upload photos and view project data'}
                  {inviteForm.role === 'viewer' && 'View-only access to shared content'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold border transition-colors hover:bg-white"
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
                  disabled={inviting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  className="flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#FF6B6B' }}
                  disabled={inviting || !inviteForm.email.trim()}
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
