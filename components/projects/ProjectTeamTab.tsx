'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { Users, Mail, Shield, MoreVertical, UserPlus, Crown, X, Search, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

interface Member {
  id: string        // project_team_members.id
  user_id: string
  name: string
  email: string
  avatar_url: string | null
  project_role: string
  added_at: string
}

interface AvailableUser {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string
}

const PROJECT_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'field_engineer', label: 'Field Engineer' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'viewer', label: 'Viewer' },
]

interface Props {
  project: ProjectDetails
}

export default function ProjectTeamTab({ project }: Props) {
  const { colors, darkMode } = useThemeColors()
  const seedMembers = (): Member[] =>
    project.teamMembers.map(m => ({
      id: m.membershipId,
      user_id: m.id,
      name: m.name,
      email: m.email,
      avatar_url: m.avatar,
      project_role: m.role,
      added_at: m.addedAt,
    }))

  const [members, setMembers] = useState<Member[]>(seedMembers)
  const [available, setAvailable] = useState<AvailableUser[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  // Add modal state
  const [addSearch, setAddSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null)
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const fetchMembers = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    const res = await fetch(`/api/projects/${project.id}/members`)
    if (res.ok) {
      const json = await res.json()
      setMembers(json.members || [])
      setAvailable(json.available || [])
    }
    if (showLoading) setLoading(false)
  }, [project.id])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleAdd = async () => {
    if (!selectedUser) return
    setAdding(true)
    setAddError('')
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser.id, project_role: selectedRole }),
    })
    if (res.ok) {
      await fetchMembers()
      setShowAddModal(false)
      setSelectedUser(null)
      setSelectedRole('viewer')
      setAddSearch('')
    } else {
      const json = await res.json()
      setAddError(json.error || 'Failed to add member')
    }
    setAdding(false)
  }

  const handleRemove = async (memberId: string) => {
    setRemoving(memberId)
    setOpenMenuId(null)
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId }),
    })
    if (res.ok) {
      await fetchMembers()
    }
    setRemoving(null)
  }

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || m.project_role === roleFilter
    return matchesSearch && matchesRole
  })

  const allRoles = Array.from(new Set(members.map(m => m.project_role)))

  const filteredAvailable = available.filter(u =>
    u.name.toLowerCase().includes(addSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(addSearch.toLowerCase())
  )

  const cardStyle = { backgroundColor: colors.bg, border: colors.border, borderRadius: '0.5rem' }
  const inputStyle = {
    backgroundColor: colors.bgAlt,
    border: colors.border,
    color: colors.text,
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?'
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Team Members</h2>
          <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>
            {loading ? '...' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
            {!loading && allRoles.length > 0 && ` · ${allRoles.length} role${allRoles.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setAddError('') }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer"
          disabled={available.length === 0 && !loading}
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Filters */}
      {members.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.textMuted }} />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '2.25rem' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', ...allRoles].map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                style={roleFilter === role
                  ? { backgroundColor: '#2563EB', color: '#fff' }
                  : { backgroundColor: colors.bgAlt, color: colors.textMuted, border: colors.border }
                }
              >
                {role === 'all' ? 'All' : role.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} style={cardStyle} className="p-4 animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 rounded-full" style={{ backgroundColor: colors.bgMuted }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded w-32" style={{ backgroundColor: colors.bgMuted }} />
                <div className="h-3 rounded w-48" style={{ backgroundColor: colors.bgMuted }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length > 0 ? (
        <div style={cardStyle} className="overflow-hidden">
          <div className="divide-y" style={{ borderColor: darkMode ? '#2d3548' : '#e5e7eb' }}>
            {filteredMembers.map(member => (
              <div key={member.id} className="p-4 flex items-center gap-4 relative">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(member.name)}
                    </div>
                  )}
                  {member.user_id === project.user_id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border-2" style={{ borderColor: colors.bg }}>
                      <Crown className="h-2.5 w-2.5 text-yellow-900" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium truncate" style={{ color: colors.text }}>{member.name}</span>
                    {member.user_id === project.user_id && (
                      <span className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: darkMode ? 'rgba(234,179,8,0.2)' : '#fef9c3', color: '#854d0e' }}>Owner</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm" style={{ color: colors.textMuted }}>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span>
                  </div>
                </div>

                {/* Role badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-1 text-xs rounded-full font-medium capitalize" style={{ backgroundColor: darkMode ? 'rgba(37,99,235,0.2)' : '#dbeafe', color: darkMode ? '#93c5fd' : '#1e40af' }}>
                    {member.project_role.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    {format(new Date(member.added_at), 'MMM d, yyyy')}
                  </span>
                </div>

                {/* Actions menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: colors.textMuted }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === member.id && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-lg shadow-lg py-1" style={{ backgroundColor: colors.bg, border: colors.border }}>
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={removing === member.id || member.user_id === project.user_id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={darkMode ? { '--tw-bg-opacity': 1 } as React.CSSProperties : {}}
                      >
                        {removing === member.id ? 'Removing...' : 'Remove from project'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={cardStyle} className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>
            {searchQuery || roleFilter !== 'all' ? 'No members found' : 'No team members yet'}
          </h3>
          <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
            {searchQuery || roleFilter !== 'all' ? 'Try adjusting your search or filters' : 'Add team members to collaborate on this project'}
          </p>
          {!searchQuery && roleFilter === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Add First Member
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      {members.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Members', value: members.length },
            { label: 'Unique Roles', value: allRoles.length },
            { label: 'With Edit Access', value: members.filter(m => ['owner', 'admin', 'project_manager'].includes(m.project_role)).length },
          ].map(stat => (
            <div key={stat.label} style={cardStyle} className="p-4">
              <div className="text-sm mb-1" style={{ color: colors.textMuted }}>{stat.label}</div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}>
          <div className="w-full max-w-md rounded-xl shadow-xl" style={{ backgroundColor: colors.bg, border: colors.border }}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: colors.border }}>
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Add Team Member</h3>
              <button onClick={() => setShowAddModal(false)} style={{ color: colors.textMuted }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {available.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: colors.textMuted }}>
                  All company members are already on this project.
                </p>
              ) : (
                <>
                  {/* Search available users */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Select Member</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.textMuted }} />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={addSearch}
                        onChange={e => setAddSearch(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg" style={{ border: colors.border }}>
                      {filteredAvailable.length === 0 ? (
                        <p className="text-sm p-3 text-center" style={{ color: colors.textMuted }}>No matches</p>
                      ) : (
                        filteredAvailable.map(user => (
                          <button
                            key={user.id}
                            onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                            className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                            style={{
                              backgroundColor: selectedUser?.id === user.id
                                ? (darkMode ? 'rgba(37,99,235,0.2)' : '#dbeafe')
                                : 'transparent',
                              borderBottom: colors.border,
                            }}
                          >
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {getInitials(user.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: colors.text }}>{user.name}</div>
                              <div className="text-xs truncate" style={{ color: colors.textMuted }}>{user.email}</div>
                            </div>
                            {selectedUser?.id === user.id && (
                              <div className="ml-auto flex-shrink-0 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Role selector */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>Project Role</label>
                    <div className="relative">
                      <select
                        value={selectedRole}
                        onChange={e => setSelectedRole(e.target.value)}
                        style={{ ...inputStyle, appearance: 'none', paddingRight: '2rem', cursor: 'pointer' }}
                      >
                        {PROJECT_ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: colors.textMuted }} />
                    </div>
                  </div>

                  {addError && (
                    <p className="text-sm text-red-500">{addError}</p>
                  )}
                </>
              )}
            </div>

            {/* Modal footer */}
            {available.length > 0 && (
              <div className="flex items-center justify-end gap-3 p-5" style={{ borderTop: colors.border }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm rounded-lg font-medium"
                  style={{ backgroundColor: colors.bgAlt, color: colors.text, border: colors.border }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!selectedUser || adding}
                  className="px-4 py-2 text-sm rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {openMenuId && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenMenuId(null)} />
      )}
    </div>
  )
}
