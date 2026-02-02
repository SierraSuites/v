'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Shield,
  AlertCircle
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  permission_granted: string | null
  permission_denied: string | null
  reason: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  profiles?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface AuditLogViewerProps {
  companyId: string
}

// ============================================
// COMPONENT
// ============================================

export default function AuditLogViewer({ companyId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const [filters, setFilters] = useState({
    resourceType: 'all',
    actionType: 'all',
    userId: '',
    startDate: '',
    endDate: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch logs
  const fetchLogs = async (page: number = 1) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.resourceType !== 'all') {
        params.append('resourceType', filters.resourceType)
      }
      if (filters.actionType !== 'all') {
        params.append('actionType', filters.actionType)
      }
      if (filters.userId) {
        params.append('userId', filters.userId)
      }
      if (filters.startDate) {
        params.append('startDate', new Date(filters.startDate).toISOString())
      }
      if (filters.endDate) {
        params.append('endDate', new Date(filters.endDate).toISOString())
      }

      const response = await fetch(`/api/audit/permissions?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch audit logs')
      }

      setLogs(data.data)
      setPagination(data.pagination)
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching audit logs')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load and refetch when filters change
  useEffect(() => {
    fetchLogs(1)
  }, [filters])

  // Get action color
  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      role_assigned: 'text-blue-700 bg-blue-50',
      role_changed: 'text-amber-700 bg-amber-50',
      role_removed: 'text-red-700 bg-red-50',
      custom_role_created: 'text-green-700 bg-green-50',
      custom_role_updated: 'text-purple-700 bg-purple-50',
      custom_role_deleted: 'text-gray-700 bg-gray-50'
    }
    return colors[action] || 'text-gray-700 bg-gray-50'
  }

  // Format action text
  const formatAction = (action: string): string => {
    return action.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Permission Audit Log</h3>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} total {pagination.total === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {Object.values(filters).some(v => v && v !== 'all') && (
            <span className="ml-1 px-2 py-0.5 text-xs font-medium text-white bg-blue-600 rounded-full">
              {Object.values(filters).filter(v => v && v !== 'all').length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Resource Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                value={filters.resourceType}
                onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="team_member">Team Member</option>
                <option value="custom_role">Custom Role</option>
                <option value="project_team">Project Team</option>
              </select>
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={filters.actionType}
                onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Actions</option>
                <option value="role_assigned">Role Assigned</option>
                <option value="role_changed">Role Changed</option>
                <option value="role_removed">Role Removed</option>
                <option value="custom_role_created">Custom Role Created</option>
                <option value="custom_role_updated">Custom Role Updated</option>
                <option value="custom_role_deleted">Custom Role Deleted</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {Object.values(filters).some(v => v && v !== 'all') && (
            <div className="mt-4">
              <button
                onClick={() => setFilters({
                  resourceType: 'all',
                  actionType: 'all',
                  userId: '',
                  startDate: '',
                  endDate: ''
                })}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
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
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Logs List */}
      {!isLoading && !error && (
        <>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No audit logs found</p>
              <p className="text-sm text-gray-400 mt-1">
                Permission changes will appear here
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {logs.map(log => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* User Avatar */}
                      <div className="flex-shrink-0">
                        {log.profiles?.avatar_url ? (
                          <img
                            src={log.profiles.avatar_url}
                            alt={log.profiles.full_name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Log Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {log.profiles?.full_name || 'Unknown User'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                {formatAction(log.action)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {log.resource_type}
                              </span>
                            </div>
                            {log.reason && (
                              <p className="text-sm text-gray-600 mt-2">
                                {log.reason}
                              </p>
                            )}
                            {(log.permission_granted || log.permission_denied) && (
                              <div className="mt-2 flex gap-2">
                                {log.permission_granted && (
                                  <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                                    Granted: {log.permission_granted}
                                  </span>
                                )}
                                {log.permission_denied && (
                                  <span className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                                    Denied: {log.permission_denied}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Timestamp */}
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs text-gray-500">
                              {formatDate(log.created_at)}
                            </p>
                            {log.ip_address && (
                              <p className="text-xs text-gray-400 mt-1">
                                {log.ip_address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(pagination.page - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = pagination.page - 2 + i
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => fetchLogs(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => fetchLogs(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
