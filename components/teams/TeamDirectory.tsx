'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Clock,
  MoreVertical,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { getRoleColor, getRoleIcon, getRoleDisplayName } from '@/lib/permissions'
import UserRoleBadge from '@/components/users/UserRoleBadge'

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

export default function TeamDirectory({
  onInviteMember,
  onEditMember
}: TeamDirectoryProps) {
  const { user: currentUser } = useCurrentUser()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        search,
        status: statusFilter,
        sortBy,
        sortOrder
      })

      if (roleFilter) {
        params.append('role', roleFilter)
      }

      const response = await fetch(`/api/team?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch team members')
      }

      setMembers(data.teamMembers || [])
      setStats(data.stats || null)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Initial load and refetch when filters change
  useEffect(() => {
    fetchTeamMembers()
  }, [search, roleFilter, statusFilter, sortBy, sortOrder])

  // Toggle member active status
  const toggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: memberId,
          isActive: !currentStatus
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update member status')
      }

      // Refetch to update UI
      fetchTeamMembers()
    } catch (err: any) {
      alert(err.message || 'Failed to update member status')
    }
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get role distribution for stats
  const getRoleDistribution = () => {
    if (!stats?.roleDistribution) return []
    return Object.entries(stats.roleDistribution).map(([role, count]) => ({
      role,
      count
    }))
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.totalMembers}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">
                  {stats.activeMembers}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-semibold text-gray-400 mt-1">
                  {stats.inactiveMembers}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-semibold text-amber-600 mt-1">
                  {stats.expiringRoles}
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </div>
      )}

      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members by name, email, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {currentUser?.permissions.canInviteMembers && onInviteMember && (
            <button
              onClick={onInviteMember}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Members</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="role">Role</option>
                <option value="joined">Join Date</option>
                <option value="lastActive">Last Active</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Members List */}
      {!loading && !error && (
        <>
          {members.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No team members found</p>
              {search && (
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your search or filters
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name || 'User'}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                            {(member.full_name || member.email)[0].toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {member.full_name || 'No name'}
                              </h3>
                              {!member.is_active && (
                                <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                                  Inactive
                                </span>
                              )}
                              {member.isExpiringSoon && (
                                <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Expiring
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
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
                              <p className="text-sm text-gray-600 mt-1">
                                {member.job_title}
                                {member.department && ` • ${member.department}`}
                              </p>
                            )}

                            {/* Roles */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <UserRoleBadge role={member.highestRole as any} />
                              {member.roles.length > 1 && (
                                <span className="text-xs text-gray-500">
                                  +{member.roles.length - 1} more
                                </span>
                              )}
                            </div>

                            {/* Joined date */}
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              Joined {formatDate(member.created_at)}
                              {member.last_sign_in_at && (
                                <>
                                  {' • Last active '}
                                  {formatDate(member.last_sign_in_at)}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {currentUser?.permissions.canManageTeam && (
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => onEditMember?.(member.id)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Edit member"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
