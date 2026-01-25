'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
      const supabase = createClient()

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Get user's company_id from profiles (single source of truth)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id, subscription_tier, full_name')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        throw new Error('Failed to load user profile')
      }

      const fetchedCompanyId = profile.company_id
      setCompanyId(fetchedCompanyId)

      // Set user name for empty state
      if (profile.full_name) {
        setUserName(profile.full_name.split(' ')[0])
      }

      // Load all stats in parallel for performance
      const [
        projectsData,
        tasksData,
        quotesData,
        punchItemsData,
        storageData,
        teamData
      ] = await Promise.all([
        // Projects stats
        supabase
          .from('projects')
          .select('status', { count: 'exact' })
          .eq('company_id', fetchedCompanyId),

        // Tasks stats
        supabase
          .from('tasks')
          .select('status, due_date', { count: 'exact' })
          .eq('company_id', fetchedCompanyId),

        // Quotes stats
        supabase
          .from('quotes')
          .select('status, total_price', { count: 'exact' })
          .eq('company_id', fetchedCompanyId),

        // Punch items stats
        supabase
          .from('punch_items')
          .select('priority, status', { count: 'exact' })
          .eq('company_id', fetchedCompanyId),

        // Storage stats
        supabase
          .from('photos')
          .select('file_size', { count: 'exact' })
          .eq('company_id', fetchedCompanyId),

        // Team members count
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .eq('company_id', fetchedCompanyId)
      ])

      // Calculate project stats
      const projects = projectsData.data || []
      const totalProjects = projects.length
      const activeProjects = projects.filter(p => p.status === 'active').length
      const onHoldProjects = projects.filter(p => p.status === 'on_hold').length
      const completedProjects = projects.filter(p => p.status === 'completed').length

      // Calculate task stats
      const tasks = tasksData.data || []
      const totalTasks = tasks.length
      const tasksCompleted = tasks.filter(t => t.status === 'completed').length
      const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length

      // Calculate overdue tasks
      const today = new Date()
      const tasksOverdue = tasks.filter(t => {
        if (t.status === 'completed' || !t.due_date) return false
        return new Date(t.due_date) < today
      }).length

      const completionRate = totalTasks > 0
        ? Math.round((tasksCompleted / totalTasks) * 100)
        : 0

      // Calculate quote stats
      const quotes = quotesData.data || []
      const totalQuoteValue = quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + (q.total_price || 0), 0)
      const pendingQuotes = quotes.filter(q => q.status === 'pending').length
      const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length

      // Calculate punch item stats
      const punchItems = punchItemsData.data || []
      const criticalItems = punchItems.filter(
        p => p.priority === 'critical' && p.status !== 'resolved'
      ).length
      const openItems = punchItems.filter(p => p.status === 'open').length
      const resolvedItems = punchItems.filter(p => p.status === 'resolved').length

      // Calculate storage stats
      const photos = storageData.data || []
      const photoCount = photos.length
      const storageUsed = photos.reduce((sum, p) => sum + (p.file_size || 0), 0) / (1024 * 1024 * 1024) // Convert to GB

      // Storage limits based on tier
      const storageLimits = {
        starter: 5,
        professional: 50,
        enterprise: 500
      }
      const storageLimit = storageLimits[profile.subscription_tier as keyof typeof storageLimits] || 5

      // Team count
      const teamMembers = teamData.count || 0

      setStats({
        totalProjects,
        activeProjects,
        onHoldProjects,
        completedProjects,
        tasksCompleted,
        tasksInProgress,
        tasksOverdue,
        completionRate,
        totalQuoteValue,
        pendingQuotes,
        acceptedQuotes,
        criticalItems,
        openItems,
        resolvedItems,
        storageUsed,
        storageLimit,
        photoCount,
        teamMembers
      })

    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <p className="text-red-800 text-sm">Failed to load dashboard stats: {error}</p>
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
      {/* Active Projects Card */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">Active Projects</h3>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Tasks Completed Card */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">Tasks Completed</h3>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className="font-medium text-red-600">{stats.tasksOverdue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Value Card */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">Quote Value</h3>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-3xl font-bold text-gray-900">
              ${(stats.totalQuoteValue / 1000).toFixed(1)}k
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
      </div>

      {/* Critical Items Card */}
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">Critical Items</h3>
          <div className={`w-12 h-12 ${stats.criticalItems > 0 ? 'bg-red-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
            <svg className={`w-6 h-6 ${stats.criticalItems > 0 ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>
    </div>
  )
}
