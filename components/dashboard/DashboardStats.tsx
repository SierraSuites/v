'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime'
import DashboardEmptyState from './DashboardEmptyState'

interface DashboardStatsData {
  // Projects
  totalProjects: number
  activeProjects: number
  onHoldProjects: number
  completedProjects: number

  // Tasks
  tasksCompleted: number
  tasksInProgress: number
  tasksOverdue: number
  completionRate: number

  // Quotes
  totalQuoteValue: number
  pendingQuotes: number
  acceptedQuotes: number

  // Punch Items
  criticalItems: number
  openItems: number
  resolvedItems: number

  // Storage
  storageUsed: number
  storageLimit: number
  photoCount: number

  // Team
  teamMembers: number
}

export default function DashboardStats() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('User')

  // Memoize the refresh callback for real-time updates
  const handleRealTimeRefresh = useCallback(() => {
    loadDashboardStats()
  }, [])

  // Subscribe to real-time updates
  const { isConnected } = useDashboardRealtime(companyId, handleRealTimeRefresh)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  async function loadDashboardStats() {
    try {
      setLoading(true)

      const res = await fetch('/api/dashboard/stats')
      if (!res.ok) {
        if (res.status === 401) throw new Error('Not authenticated')
        throw new Error('Failed to load stats')
      }

      const data = await res.json()

      setCompanyId(data.userId)

      if (data.userName) {
        setUserName(data.userName.split(' ')[0])
      }

      setStats({
        totalProjects: data.projects.total,
        activeProjects: data.projects.active,
        onHoldProjects: data.projects.onHold,
        completedProjects: data.projects.completed,
        tasksCompleted: data.tasks.completed,
        tasksInProgress: data.tasks.inProgress,
        tasksOverdue: data.tasks.overdue,
        completionRate: data.tasks.completionRate,
        totalQuoteValue: data.quotes.totalValue,
        pendingQuotes: data.quotes.pending,
        acceptedQuotes: data.quotes.accepted,
        criticalItems: data.punchItems.critical,
        openItems: data.punchItems.open,
        resolvedItems: data.punchItems.resolved,
        storageUsed: data.storage.used,
        storageLimit: data.storage.limit,
        photoCount: data.storage.photoCount,
        teamMembers: data.team.members,
      })

    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  // Spec: Skeleton loaders for all cards (Section UI/UX - Loading States)
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="relative overflow-hidden bg-white rounded-xl border p-6 shadow-sm animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-20 mb-4" />
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Spec: Error states with retry button (Section UI/UX - Error States)
  if (error) {
    return (
      <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded mb-8">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-semibold text-red-900 mb-1">Failed to load dashboard statistics</h4>
            <p className="text-sm text-red-800 mb-3">
              {error}. Try refreshing the page.
            </p>
            <button
              onClick={() => loadDashboardStats()}
              className="px-3 py-1.5 text-sm font-medium border border-red-300 rounded-lg text-red-700 hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  // Show empty state if user has no data
  const hasNoData =
    stats.totalProjects === 0 &&
    stats.tasksCompleted === 0 &&
    stats.totalQuoteValue === 0 &&
    stats.photoCount === 0

  if (hasNoData) {
    return <DashboardEmptyState userName={userName} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Active Projects Card - Spec Section 1A: Click: Navigate to /projects */}
      <button
        onClick={() => router.push('/projects?status=active')}
        className="relative overflow-hidden bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] text-left cursor-pointer"
      >
        {/* Gradient background circle - Quality guide StatCard pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">Active Projects</h3>
          {/* Gradient icon badge - Quality guide line 465-471 */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-3xl font-bold text-gray-900">{stats.activeProjects}</div>
            <p className="text-xs text-gray-500 mt-1">In progress</p>
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">On Hold</span>
              <span className="font-medium text-orange-600">{stats.onHoldProjects}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Completed</span>
              <span className="font-medium text-green-600">{stats.completedProjects}</span>
            </div>
          </div>
        </div>
        {/* Arrow indicator - Quality guide line 501-505 */}
        <div className="absolute bottom-4 right-4 text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Tasks Card - Spec Section 1B: Click: Navigate to /taskflow */}
      {/* Color: Red if overdue >0, Yellow if 5-10, Green if <5 */}
      <button
        onClick={() => router.push('/taskflow')}
        className={`relative overflow-hidden bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] text-left cursor-pointer ${
          stats.tasksOverdue > 0 ? 'ring-2 ring-red-500' : ''
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">Tasks Completed</h3>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${
            stats.tasksOverdue > 0
              ? 'from-red-500 to-red-600'
              : 'from-green-500 to-green-600'
          }`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-3xl font-bold text-gray-900">{stats.tasksCompleted}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.completionRate}% completion rate</p>
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">In Progress</span>
              <span className="font-medium text-blue-600">{stats.tasksInProgress}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Overdue</span>
              <span className={`font-medium ${stats.tasksOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {stats.tasksOverdue}
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4 text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Quote Value Card - Spec: Click: Navigate to quotes */}
      <button
        onClick={() => router.push('/quotes')}
        className="relative overflow-hidden bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] text-left cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-purple-600 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">Quote Value</h3>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              ${stats.totalQuoteValue >= 1000
                ? `${(stats.totalQuoteValue / 1000).toFixed(1)}k`
                : stats.totalQuoteValue.toFixed(0)
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">Accepted quotes</p>
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Pending</span>
              <span className="font-medium text-orange-600">{stats.pendingQuotes}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Accepted</span>
              <span className="font-medium text-green-600">{stats.acceptedQuotes}</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4 text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Critical Items Card - Spec: urgent ring animation when critical > 0 */}
      <button
        onClick={() => router.push('/punchlist')}
        className={`relative overflow-hidden bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] text-left cursor-pointer ${
          stats.criticalItems > 0 ? 'ring-2 ring-red-500 animate-pulse' : ''
        }`}
      >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${
          stats.criticalItems > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500'
        } opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">Critical Items</h3>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${
            stats.criticalItems > 0
              ? 'from-red-500 to-red-600'
              : 'from-gray-400 to-gray-500'
          }`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className={`text-3xl font-bold ${stats.criticalItems > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats.criticalItems}
            </div>
            <p className="text-xs text-gray-500 mt-1">Needs attention</p>
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Open</span>
              <span className="font-medium text-orange-600">{stats.openItems}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Resolved</span>
              <span className="font-medium text-green-600">{stats.resolvedItems}</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4 text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  )
}
