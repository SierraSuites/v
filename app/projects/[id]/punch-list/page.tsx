"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { punchListService } from '@/lib/punchlist'
import PunchListPanel from '@/components/fieldsnap/PunchListPanel'
import Link from 'next/link'

interface PunchListFiltersState {
  status: 'all' | 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed'
  severity: 'all' | 'critical' | 'high' | 'medium' | 'low'
  category: 'all' | 'safety' | 'quality' | 'progress' | 'other'
  assignedTo: string
  searchQuery: string
}

export default function ProjectPunchListPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [punchItems, setPunchItems] = useState<any[]>([])
  const [filteredItems, setFilteredItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  })

  const [filters, setFilters] = useState<PunchListFiltersState>({
    status: 'open',
    severity: 'all',
    category: 'all',
    assignedTo: 'all',
    searchQuery: ''
  })

  useEffect(() => {
    if (params.id) {
      loadProject(params.id as string)
      loadPunchItems(params.id as string)
    }
  }, [params.id])

  useEffect(() => {
    applyFilters()
  }, [punchItems, filters])

  const loadProject = async (projectId: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(data)
    } catch (err) {
      console.error('Error loading project:', err)
    }
  }

  const loadPunchItems = async (projectId: string) => {
    try {
      setLoading(true)
      const items = await punchListService.getByProject(projectId)
      setPunchItems(items)

      // Calculate stats
      const newStats = {
        total: items.length,
        open: items.filter(i => i.status === 'open').length,
        in_progress: items.filter(i => i.status === 'in_progress').length,
        resolved: items.filter(i => i.status === 'resolved').length,
        critical: items.filter(i => i.severity === 'critical').length,
        high: items.filter(i => i.severity === 'high').length,
        medium: items.filter(i => i.severity === 'medium').length,
        low: items.filter(i => i.severity === 'low').length
      }
      setStats(newStats)
    } catch (err) {
      console.error('Error loading punch items:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...punchItems]

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status)
    }

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(item => item.severity === filters.severity)
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category)
    }

    // Assigned to filter
    if (filters.assignedTo !== 'all') {
      filtered = filtered.filter(item => item.assigned_to === filters.assignedTo)
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
      )
    }

    setFilteredItems(filtered)
  }

  const handleFilterChange = (key: keyof PunchListFiltersState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleExportReport = async () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon!')
  }

  const handlePunchItemUpdate = async () => {
    if (params.id) {
      await loadPunchItems(params.id as string)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: '#4A4A4A' }}>Loading punch list...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${params.id}`}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>📋 Punch List</h1>
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                  {project?.name || 'Quality and safety issues requiring attention'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportReport}
                className="px-4 py-2 rounded-lg border font-semibold hover:bg-gray-50"
                style={{ borderColor: '#E5E7EB', color: '#374151' }}
              >
                📊 Export Report
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Total Items</p>
              <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.total}</p>
            </div>

            <div className="p-4 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }} onClick={() => handleFilterChange('status', 'open')}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Open</p>
              <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{stats.open}</p>
            </div>

            <div className="p-4 rounded-xl cursor-pointer hover:bg-yellow-50 transition-colors" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }} onClick={() => handleFilterChange('status', 'in_progress')}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>In Progress</p>
              <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{stats.in_progress}</p>
            </div>

            <div className="p-4 rounded-xl cursor-pointer hover:bg-green-50 transition-colors" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }} onClick={() => handleFilterChange('status', 'resolved')}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Resolved</p>
              <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{stats.resolved}</p>
            </div>

            <div className="p-4 rounded-xl cursor-pointer hover:bg-red-50 transition-colors" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }} onClick={() => handleFilterChange('severity', 'critical')}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Critical</p>
              <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{stats.critical}</p>
            </div>

            <div className="p-4 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }} onClick={() => handleFilterChange('severity', 'high')}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>High</p>
              <p className="text-2xl font-bold" style={{ color: '#F97316' }}>{stats.high}</p>
            </div>

            <div className="p-4 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }} onClick={() => handleFilterChange('severity', 'medium')}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Medium</p>
              <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{stats.medium}</p>
            </div>

            <div className="p-4 rounded-xl cursor-pointer hover:bg-yellow-50 transition-colors" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }} onClick={() => handleFilterChange('severity', 'low')}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Low</p>
              <p className="text-2xl font-bold" style={{ color: '#FBBF24' }}>{stats.low}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                Search
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#6B7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  placeholder="Search punch items..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="verified">Verified</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="all">All Categories</option>
                <option value="safety">Safety</option>
                <option value="quality">Quality</option>
                <option value="progress">Progress</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>
              Showing {filteredItems.length} of {punchItems.length} items
            </span>
            {filters.status !== 'all' && (
              <button
                onClick={() => handleFilterChange('status', 'all')}
                className="px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-200"
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Status: {filters.status} ×
              </button>
            )}
            {filters.severity !== 'all' && (
              <button
                onClick={() => handleFilterChange('severity', 'all')}
                className="px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-200"
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Severity: {filters.severity} ×
              </button>
            )}
            {filters.category !== 'all' && (
              <button
                onClick={() => handleFilterChange('category', 'all')}
                className="px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-200"
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Category: {filters.category} ×
              </button>
            )}
            {filters.searchQuery && (
              <button
                onClick={() => handleFilterChange('searchQuery', '')}
                className="px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-200"
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Search: "{filters.searchQuery}" ×
              </button>
            )}
          </div>
        </div>

        {/* Punch List */}
        <PunchListPanel
          projectId={params.id as string}
          onItemUpdated={handlePunchItemUpdate}
        />
      </div>
    </div>
  )
}
