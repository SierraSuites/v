"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { punchListService } from '@/lib/punchlist'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface PunchListWidgetProps {
  projectId?: string
  showAllProjects?: boolean
  maxItems?: number
}

export default function PunchListWidget({
  projectId,
  showAllProjects = false,
  maxItems = 5
}: PunchListWidgetProps) {
  const router = useRouter()
  const { colors, darkMode } = useThemeColors()
  const [criticalItems, setCriticalItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    open: 0
  })

  useEffect(() => {
    loadCriticalItems()
  }, [projectId, showAllProjects])

  const loadCriticalItems = async () => {
    try {
      setLoading(true)

      let items: any[] = []

      if (projectId) {
        // Load critical items for specific project
        const allItems = await punchListService.getByProject(projectId)
        items = allItems
          .filter(item => item.severity === 'critical' && item.status !== 'closed')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      } else if (showAllProjects) {
        // Load critical items across all projects (would need a new service method)
        // For now, we'll show a message
        items = []
      }

      setCriticalItems(items)

      // Calculate stats
      const totalItems = items.length
      const criticalCount = items.filter(i => i.severity === 'critical').length
      const openCount = items.filter(i => i.status === 'open').length

      setStats({
        total: totalItems,
        critical: criticalCount,
        open: openCount
      })
    } catch (err) {
      console.error('Error loading critical punch items:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewAll = () => {
    if (projectId) {
      router.push(`/projects/${projectId}/punch-list`)
    } else {
      router.push('/punch-list')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#DC2626'
      case 'in_progress': return '#F59E0B'
      case 'resolved': return '#10B981'
      case 'verified': return '#6BCB77'
      case 'closed': return '#6B7280'
      default: return '#6B7280'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626'
      case 'major': return '#F97316'
      case 'minor': return '#FBBF24'
      default: return '#6B7280'
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: colors.bg }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: darkMode ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2' }}>
            🚨
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: colors.text }}>Critical Punch Items</h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>Loading...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 rounded-lg" style={{ backgroundColor: colors.bgAlt }} />
          <div className="h-16 rounded-lg" style={{ backgroundColor: colors.bgAlt }} />
          <div className="h-16 rounded-lg" style={{ backgroundColor: colors.bgAlt }} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="p-6" style={{ borderBottom: colors.border }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: criticalItems.length > 0
                ? (darkMode ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2')
                : (darkMode ? 'rgba(107, 203, 119, 0.2)' : '#F0FDF4') }}
            >
              {criticalItems.length > 0 ? '🚨' : '✅'}
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: colors.text }}>
                Critical Punch Items
              </h3>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {criticalItems.length > 0
                  ? `${criticalItems.length} item${criticalItems.length !== 1 ? 's' : ''} requiring immediate attention`
                  : 'No critical issues found'}
              </p>
            </div>
          </div>
          {criticalItems.length > 0 && (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
              style={{ backgroundColor: darkMode ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2', color: '#DC2626' }}
            >
              {criticalItems.length}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {stats.total > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt }}>
              <p className="text-xs font-semibold mb-1" style={{ color: colors.textMuted }}>Total</p>
              <p className="text-xl font-bold" style={{ color: colors.text }}>{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: darkMode ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: darkMode ? '#f87171' : '#991B1B' }}>Critical</p>
              <p className="text-xl font-bold" style={{ color: '#DC2626' }}>{stats.critical}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: darkMode ? '#93c5fd' : '#1E40AF' }}>Open</p>
              <p className="text-xl font-bold" style={{ color: '#3B82F6' }}>{stats.open}</p>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        {criticalItems.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-6xl mb-4 block">🎉</span>
            <h4 className="font-bold text-lg mb-2" style={{ color: colors.text }}>
              All Clear!
            </h4>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              No critical punch items at this time
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {criticalItems.slice(0, maxItems).map(item => (
              <div
                key={item.id}
                className="p-4 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                style={{ border: colors.border }}
                onClick={() => router.push(`/fieldsnap/${item.photo_id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                        style={{
                          backgroundColor: `${getSeverityColor(item.severity)}20`,
                          color: getSeverityColor(item.severity)
                        }}
                      >
                        {item.severity}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          backgroundColor: `${getStatusColor(item.status)}20`,
                          color: getStatusColor(item.status)
                        }}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h5 className="font-bold text-sm mb-1 truncate" style={{ color: colors.text }}>
                      {item.title}
                    </h5>
                    {item.description && (
                      <p className="text-xs line-clamp-2" style={{ color: colors.textMuted }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.photo_url && (
                    <img
                      src={item.photo_url}
                      alt={item.title}
                      className="w-16 h-16 rounded-lg object-cover ml-3"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs" style={{ color: colors.textMuted }}>
                  <div className="flex items-center gap-3">
                    {item.location && (
                      <span className="flex items-center gap-1">
                        📍 {item.location}
                      </span>
                    )}
                    {item.category && (
                      <span className="flex items-center gap-1">
                        🏷️ {item.category}
                      </span>
                    )}
                  </div>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {criticalItems.length > maxItems && (
              <button
                onClick={handleViewAll}
                className="w-full py-3 rounded-lg font-semibold text-sm transition-colors"
                style={{ border: `2px dashed ${darkMode ? '#4b5563' : '#E5E7EB'}`, color: colors.textMuted }}
              >
                View all {criticalItems.length} critical items →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {criticalItems.length > 0 && (
        <div className="p-4" style={{ borderTop: colors.border, backgroundColor: colors.bgAlt }}>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: colors.textMuted }}>
              Updated {new Date().toLocaleTimeString()}
            </p>
            <button
              onClick={handleViewAll}
              className="text-sm font-semibold hover:underline"
              style={{ color: '#FF6B6B' }}
            >
              View Full Punch List →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
