'use client'

import { useState, useEffect } from 'react'
import {
  Search, Filter, UserPlus, Mail, Phone, Calendar,
  Clock, MoreVertical, Shield, AlertCircle, CheckCircle, XCircle
} from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import UserRoleBadge from '@/components/users/UserRoleBadge'
import toast from 'react-hot-toast'

// ============================================
// TYPES
// ============================================

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  job_title: string | null
  department: string | null
  created_at: string
  last_sign_in_at: string | null
  is_active: boolean
  highestRole: string
  roles: Array<{
    roleId: string
    roleName: string
    roleSlug: string
    color: string
    icon: string
    isSystemRole: boolean
    assignedAt: string
    expiresAt: string | null
    projectIds: string[] | null
  }>
  isExpiringSoon: boolean
}

interface TeamStats {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  expiringRoles: number
  roleDistribution: Record<string, number>
}

interface TeamDirectoryProps {
  onInviteMember?: () => void
  onEditMember?: (memberId: string) => void
}

// ============================================
// COMPONENT
// ============================================

export default function TeamDirectory({ onInviteMember, onEditMember }: TeamDirectoryProps) {
  const { user: currentUser } = useCurrentUser()
  const { colors, darkMode } = useThemeColors()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [showFilters, setShowFilters] = useState(false)

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ search, status: statusFilter, sortBy, sortOrder })
      if (roleFilter) params.append('role', roleFilter)
      const response = await fetch(`/api/team?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch team members')
      setMembers(data.teamMembers || [])
      setStats(data.stats || null)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeamMembers() }, [search, roleFilter, statusFilter, sortBy, sortOrder])

  const toggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId, isActive: !currentStatus }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update member status')
      fetchTeamMembers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member status')
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // ─── Styles ───────────────────────────────────────────────────────────────

  const cardStyle = {
    backgroundColor: colors.bg,
    border: colors.border,
    borderRadius: '0.5rem',
    padding: '1rem',
  }

  const inputStyle = {
    backgroundColor: colors.bgAlt,
    border: colors.border,
    color: colors.text,
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }

  const selectStyle = {
    backgroundColor: colors.bgAlt,
    border: colors.border,
    color: colors.text,
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }

  const hoverBg = darkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB'
  const dividerColor = darkMode ? '#1e2333' : '#E5E7EB'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Total Members</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: colors.text }}>{stats.totalMembers}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Active</p>
                <p className="text-2xl font-semibold mt-1 text-green-500">{stats.activeMembers}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Inactive</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: colors.textMuted }}>{stats.inactiveMembers}</p>
              </div>
              <XCircle className="w-8 h-8" style={{ color: colors.textMuted }} />
            </div>
          </div>

          <div style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Expiring Soon</p>
                <p className="text-2xl font-semibold mt-1 text-amber-500">{stats.expiringRoles}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
        </div>
      )}

      {/* Search + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
            <input
              type="text"
              placeholder="Search members by name, email, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'transparent', border: colors.border, color: colors.text, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {currentUser?.permissions.canInviteMembers && onInviteMember && (
            <button
              onClick={onInviteMember}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: '#2563eb', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div style={{ backgroundColor: colors.bgAlt, border: colors.border, borderRadius: '0.5rem', padding: '1rem' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textMuted }}>Status</label>
              <select style={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Members</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textMuted }}>Sort By</label>
              <select style={selectStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Name</option>
                <option value="role">Role</option>
                <option value="joined">Join Date</option>
                <option value="lastActive">Last Active</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textMuted }}>Order</label>
              <select style={selectStyle} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: darkMode ? 'rgba(220,38,38,0.1)' : '#fef2f2', border: `1px solid ${darkMode ? 'rgba(220,38,38,0.3)' : '#fecaca'}` }}>
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* Members List */}
      {!loading && !error && (
        <>
          {members.length === 0 ? (
            <div className="text-center py-12 rounded-lg" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <Shield className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textMuted }} />
              <p style={{ color: colors.textMuted }}>No team members found</p>
              {search && <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Try adjusting your search or filters</p>}
            </div>
          ) : (
            <div style={{ backgroundColor: colors.bg, border: colors.border, borderRadius: '0.5rem', overflow: 'hidden' }}>
              {members.map((member, i) => (
                <div
                  key={member.id}
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${dividerColor}`, transition: 'background-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.full_name || 'User'} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                          {(member.full_name || member.email)[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold truncate" style={{ color: colors.text }}>
                              {member.full_name || 'No name'}
                            </h3>
                            {!member.is_active && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: colors.bgMuted, color: colors.textMuted }}>
                                Inactive
                              </span>
                            )}
                            {member.isExpiringSoon && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1" style={{ backgroundColor: darkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7', color: '#d97706' }}>
                                <Clock className="w-3 h-3" /> Expiring
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: colors.textMuted }}>
                            {member.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" />
                                {member.email}
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                {member.phone}
                              </div>
                            )}
                          </div>

                          {member.job_title && (
                            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                              {member.job_title}{member.department && ` • ${member.department}`}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <UserRoleBadge role={member.highestRole as any} />
                            {member.roles.length > 1 && (
                              <span className="text-xs" style={{ color: colors.textMuted }}>+{member.roles.length - 1} more</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: colors.textMuted }}>
                            <Calendar className="w-3 h-3" />
                            Joined {formatDate(member.created_at)}
                            {member.last_sign_in_at && <> • Last active {formatDate(member.last_sign_in_at)}</>}
                          </div>
                        </div>

                        {/* Actions */}
                        {currentUser?.permissions.canManageTeam && (
                          <button
                            onClick={() => onEditMember?.(member.id)}
                            className="p-2 rounded-lg transition-colors shrink-0"
                            title="Edit member"
                            style={{ color: colors.textMuted, cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = hoverBg; (e.currentTarget.style.color = colors.text) }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; (e.currentTarget.style.color = colors.textMuted) }}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
