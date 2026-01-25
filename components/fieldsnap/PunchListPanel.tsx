"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  punchListService,
  type PunchListItem,
  type PunchListStatus,
  type PunchListSeverity,
  getSeverityColor,
  getSeverityIcon,
  getStatusColor,
  getStatusDisplayName,
  isOverdue
} from '@/lib/punchlist'
import PunchListItemCard from './PunchListItemCard'

interface PunchListPanelProps {
  projectId: string
  photoId?: string // Optional: filter to specific photo
  compact?: boolean
  showFilters?: boolean
  onItemClick?: (item: PunchListItem) => void
  onItemUpdated?: () => void
}

export default function PunchListPanel({
  projectId,
  photoId,
  compact = false,
  showFilters = true,
  onItemClick,
  onItemUpdated
}: PunchListPanelProps) {
  const [items, setItems] = useState<PunchListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<PunchListStatus[]>([])
  const [severityFilter, setSeverityFilter] = useState<PunchListSeverity[]>([])
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [showAIOnly, setShowAIOnly] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    overdue: 0
  })

  // Load punch list items
  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build filters
      const filters: any = {}
      if (statusFilter.length > 0) filters.status = statusFilter
      if (severityFilter.length > 0) filters.severity = severityFilter
      if (showOverdueOnly) filters.overdue = true
      if (showAIOnly) filters.ai_generated = true

      let fetchedItems = await punchListService.getByProject(projectId, filters)

      // Filter by photo if specified
      if (photoId) {
        fetchedItems = fetchedItems.filter(item => item.photo_id === photoId)
      }

      setItems(fetchedItems)

      // Calculate stats
      const statsData = await punchListService.getStats(projectId)
      setStats(statsData)
    } catch (err) {
      console.error('Error loading punch list items:', err)
      setError('Failed to load punch list items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()

    // Subscribe to real-time updates
    const unsubscribe = punchListService.subscribeToProject(projectId, (payload) => {
      console.log('Punch list update:', payload)
      loadItems()
      onItemUpdated?.()
    })

    return () => {
      unsubscribe()
    }
  }, [projectId, photoId, statusFilter, severityFilter, showOverdueOnly, showAIOnly])

  // Filter toggle helpers
  const toggleStatusFilter = (status: PunchListStatus) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const toggleSeverityFilter = (severity: PunchListSeverity) => {
    setSeverityFilter(prev =>
      prev.includes(severity)
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    )
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#FF6B6B' }} />
        <span className="ml-3 text-sm" style={{ color: '#6B7280' }}>Loading punch list...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
        <p className="text-sm" style={{ color: '#DC2626' }}>⚠️ {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#E0E0E0' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
              📋 Punch List
            </h3>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Quality and safety issues requiring attention
            </p>
          </div>
          {!compact && (
            <Link
              href={`/projects/${projectId}/punch-list`}
              className="px-4 py-2 rounded-lg border font-semibold text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
            >
              View All →
            </Link>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
            <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Total Items</p>
            <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.total}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
            <p className="text-xs mb-1" style={{ color: '#991B1B' }}>Critical</p>
            <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{stats.critical}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
            <p className="text-xs mb-1" style={{ color: '#92400E' }}>In Progress</p>
            <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{stats.in_progress}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#DCFCE7' }}>
            <p className="text-xs mb-1" style={{ color: '#166534' }}>Resolved</p>
            <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{stats.resolved}</p>
          </div>
        </div>

        {/* Overdue Warning */}
        {stats.overdue > 0 && (
          <div className="mt-4 p-3 rounded-lg border-l-4" style={{ backgroundColor: '#FEE2E2', borderColor: '#DC2626' }}>
            <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>
              ⚠️ {stats.overdue} item{stats.overdue !== 1 ? 's' : ''} overdue
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && !compact && (
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#E0E0E0' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#1A1A1A' }}>Filters</p>

          {/* Status Filters */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>STATUS</p>
            <div className="flex flex-wrap gap-2">
              {(['open', 'in_progress', 'pending_review', 'resolved', 'closed'] as PunchListStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: statusFilter.includes(status) ? getStatusColor(status) : '#F3F4F6',
                    color: statusFilter.includes(status) ? '#FFFFFF' : '#6B7280',
                    border: `2px solid ${statusFilter.includes(status) ? getStatusColor(status) : '#E5E7EB'}`
                  }}
                >
                  {getStatusDisplayName(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Filters */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: '#6B7280' }}>SEVERITY</p>
            <div className="flex flex-wrap gap-2">
              {(['critical', 'high', 'medium', 'low'] as PunchListSeverity[]).map(severity => (
                <button
                  key={severity}
                  onClick={() => toggleSeverityFilter(severity)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: severityFilter.includes(severity) ? getSeverityColor(severity) : '#F3F4F6',
                    color: severityFilter.includes(severity) ? '#FFFFFF' : '#6B7280',
                    border: `2px solid ${severityFilter.includes(severity) ? getSeverityColor(severity) : '#E5E7EB'}`
                  }}
                >
                  {getSeverityIcon(severity)} {severity.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: showOverdueOnly ? '#FEE2E2' : '#F3F4F6',
                color: showOverdueOnly ? '#991B1B' : '#6B7280',
                border: `2px solid ${showOverdueOnly ? '#DC2626' : '#E5E7EB'}`
              }}
            >
              ⏰ Overdue Only
            </button>
            <button
              onClick={() => setShowAIOnly(!showAIOnly)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: showAIOnly ? '#E0E7FF' : '#F3F4F6',
                color: showAIOnly ? '#3730A3' : '#6B7280',
                border: `2px solid ${showAIOnly ? '#6366F1' : '#E5E7EB'}`
              }}
            >
              🤖 AI-Generated Only
            </button>
            {(statusFilter.length > 0 || severityFilter.length > 0 || showOverdueOnly || showAIOnly) && (
              <button
                onClick={() => {
                  setStatusFilter([])
                  setSeverityFilter([])
                  setShowOverdueOnly(false)
                  setShowAIOnly(false)
                }}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  border: '2px solid #DC2626'
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: '#E0E0E0' }}>
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-lg font-semibold mb-2" style={{ color: '#1A1A1A' }}>
            No Punch List Items
          </p>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            {statusFilter.length > 0 || severityFilter.length > 0 || showOverdueOnly || showAIOnly
              ? 'No items match the current filters.'
              : 'All quality issues have been resolved!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <PunchListItemCard
              key={item.id}
              item={item}
              compact={compact}
              onClick={() => onItemClick?.(item)}
              onUpdated={() => {
                loadItems()
                onItemUpdated?.()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
