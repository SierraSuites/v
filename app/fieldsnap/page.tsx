"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPhotos, subscribeToPhotos, getStorageStats, type Photo } from '@/lib/supabase/photos'
import PhotoUploadModal from '@/components/fieldsnap/PhotoUploadModal'
import BatchPhotoUpload from '@/components/fieldsnap/BatchPhotoUpload'
import { useToast } from '@/components/ToastNotification'
import MapView from '@/components/fieldsnap/MapView'
import TimelineView from '@/components/fieldsnap/TimelineView'

// Types - using Photo type from lib/supabase/photos

interface DashboardStats {
  totalPhotos: number
  todayUploads: number
  storageUsed: number
  storageTotal: number
  activeProjects: number
  // AI stats removed - were displaying fake data
}

export default function FieldSnapPage() {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalPhotos: 0,
    todayUploads: 0,
    storageUsed: 0,
    storageTotal: 10 * 1024 * 1024 * 1024, // 10GB default
    activeProjects: 0
  })

  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map' | 'timeline'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // Selection and bulk actions
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Sidebar and mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadPhotos()
      loadStats()

      // Subscribe to real-time updates
      const unsubscribe = subscribeToPhotos((payload) => {
        if (payload.eventType === 'INSERT') {
          setPhotos(prev => [payload.new as Photo, ...prev])
          loadStats() // Refresh stats
        } else if (payload.eventType === 'UPDATE') {
          setPhotos(prev => prev.map(p => p.id === payload.new.id ? payload.new as Photo : p))
        } else if (payload.eventType === 'DELETE') {
          setPhotos(prev => prev.filter(p => p.id !== payload.old.id))
          loadStats() // Refresh stats
        }
      })

      return () => {
        unsubscribe()
      }
    }
  }, [user])

  const loadUser = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      setUser(session.user)
    } else {
      router.push('/login')
    }
    setLoading(false)
  }

  const loadPhotos = async () => {
    const { data, error } = await getPhotos()

    if (error) {
      console.error('Error loading photos:', error)
      return
    }

    if (data) {
      setPhotos(data as Photo[])
    }
  }

  const loadStats = async () => {
    // Get storage stats
    const { data: storageData } = await getStorageStats()

    // Calculate stats from photos
    const totalPhotos = photos.length
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayUploads = photos.filter(p => new Date(p.uploaded_at) >= today).length

    const uniqueProjects = new Set(photos.filter(p => p.project_id).map(p => p.project_id))
    const activeProjects = uniqueProjects.size

    // AI features removed - were displaying fake data
    // Real AI integration planned for future release

    // Get user plan to determine storage quota
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', user?.id)
      .single()

    let storageTotal = 10 * 1024 * 1024 * 1024 // 10GB default (Starter)
    if (profile?.plan === 'professional') {
      storageTotal = 50 * 1024 * 1024 * 1024 // 50GB
    } else if (profile?.plan === 'enterprise') {
      storageTotal = 500 * 1024 * 1024 * 1024 // 500GB
    }

    setStats({
      totalPhotos,
      todayUploads,
      storageUsed: storageData?.totalSize || 0,
      storageTotal,
      activeProjects
    })
  }

  // Filter and search logic
  const filteredPhotos = useMemo(() => {
    let filtered = [...photos]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(photo =>
        photo.filename.toLowerCase().includes(query) ||
        photo.description?.toLowerCase().includes(query) ||
        photo.tags.some(tag => tag.toLowerCase().includes(query)) ||
        photo.ai_tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Project filter
    if (selectedProject !== 'all') {
      filtered = filtered.filter(p => p.project_id === selectedProject)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      filtered = filtered.filter(p => {
        const photoDate = new Date(p.captured_at)
        switch (dateFilter) {
          case 'today':
            return photoDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return photoDate >= weekAgo
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            return photoDate >= monthAgo
          default:
            return true
        }
      })
    }

    // Tag filter
    if (tagFilter !== 'all') {
      filtered = filtered.filter(p => p.tags.includes(tagFilter) || p.ai_tags.includes(tagFilter))
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
        case 'oldest':
          return new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
        case 'project':
          return (a.project_name || '').localeCompare(b.project_name || '')
        case 'size':
          return b.file_size - a.file_size
        default:
          return 0
      }
    })

    return filtered
  }, [photos, searchQuery, selectedProject, dateFilter, tagFilter, statusFilter, sortBy])

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Storage percentage
  const storagePercentage = (stats.storageUsed / stats.storageTotal) * 100

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
          <p className="mt-4 text-sm" style={{ color: '#4A4A4A' }}>Loading FieldSnap...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
        style={{ backgroundColor: '#1A1A1A' }}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid #2A2A2A' }}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF6B6B' }}>
                  <span className="text-xl">📸</span>
                </div>
                <span className="font-bold text-lg text-white">FieldSnap</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>

            <Link href="/projects" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {!sidebarCollapsed && <span>Projects</span>}
            </Link>

            <Link href="/taskflow" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {!sidebarCollapsed && <span>TaskFlow</span>}
            </Link>

            <Link href="/fieldsnap" className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-white" style={{ backgroundColor: '#FF6B6B' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {!sidebarCollapsed && <span>FieldSnap</span>}
            </Link>

            {!sidebarCollapsed && (
              <div className="pt-4">
                <p className="px-4 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Views</p>
                <Link href="/fieldsnap/capture" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                  <span className="text-lg">📷</span>
                  <span className="text-sm">Smart Capture</span>
                </Link>
                <Link href="/fieldsnap/analytics" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                  <span className="text-lg">📊</span>
                  <span className="text-sm">Analytics</span>
                </Link>
                <Link href="/fieldsnap/reports" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                  <span className="text-lg">📄</span>
                  <span className="text-sm">Reports</span>
                </Link>
              </div>
            )}
          </nav>

          {/* Storage Indicator */}
          {!sidebarCollapsed && (
            <div className="p-4 m-4 rounded-lg" style={{ backgroundColor: '#2A2A2A' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white/70">Storage</span>
                <span className="text-xs text-white/50">{Math.round(storagePercentage)}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1A1A1A' }}>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, storagePercentage)}%`,
                    backgroundColor: storagePercentage > 90 ? '#DC2626' : storagePercentage > 70 ? '#FFD93D' : '#6BCB77'
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-white/50">
                <span>{formatBytes(stats.storageUsed)}</span>
                <span>{formatBytes(stats.storageTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 p-4 lg:p-6" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0' }}>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#4A4A4A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search photos by name, tag, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors text-white hover:opacity-90"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="hidden md:inline">Upload</span>
            </button>

            <button
              onClick={() => setShowBatchUpload(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors border-2 hover:bg-gray-50"
              style={{ borderColor: '#FF6B6B', color: '#FF6B6B' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span className="hidden lg:inline">Batch Upload</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="sm:hidden p-2 rounded-lg font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </header>

        {/* Dashboard Stats */}
        <div className="p-4 lg:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: '#4A4A4A' }}>Total Photos</span>
                <span className="text-2xl">📸</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.totalPhotos.toLocaleString()}</p>
              <p className="text-xs mt-1" style={{ color: '#6BCB77' }}>+{stats.todayUploads} today</p>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: '#4A4A4A' }}>Active Projects</span>
                <span className="text-2xl">🏗️</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.activeProjects}</p>
              <p className="text-xs mt-1" style={{ color: '#4A4A4A' }}>With media</p>
            </div>

          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'grid' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                style={{ backgroundColor: viewMode === 'grid' ? '#FF6B6B' : 'transparent' }}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'list' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                style={{ backgroundColor: viewMode === 'list' ? '#FF6B6B' : 'transparent' }}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'map' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                style={{ backgroundColor: viewMode === 'map' ? '#FF6B6B' : 'transparent' }}
              >
                Map
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'timeline' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                style={{ backgroundColor: viewMode === 'timeline' ? '#FF6B6B' : 'transparent' }}
              >
                Timeline
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg text-sm flex-1 sm:flex-none"
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="project">By Project</option>
                <option value="size">By Size</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
              >
                Filters
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 mb-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#4A4A4A' }}>Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#4A4A4A' }}>Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                >
                  <option value="all">All Projects</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#4A4A4A' }}>Tags</label>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                >
                  <option value="all">All Tags</option>
                  <option value="progress">Progress</option>
                  <option value="safety">Safety</option>
                  <option value="quality">Quality</option>
                  <option value="defect">Defects</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#4A4A4A' }}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}

          {/* Photos Grid/List/Map/Timeline */}
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-20 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <span className="text-6xl mb-4 block">📸</span>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>No Photos Yet</h3>
              <p className="text-sm mb-6" style={{ color: '#4A4A4A' }}>
                Start capturing your construction site with FieldSnap
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 rounded-lg font-semibold text-white"
                style={{ backgroundColor: '#FF6B6B' }}
              >
                Upload Your First Photo
              </button>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' :
              viewMode === 'list' ? 'space-y-2' :
              viewMode === 'map' ? 'h-[600px] rounded-xl overflow-hidden' :
              'space-y-4'
            }>
              {viewMode === 'grid' && filteredPhotos.map(photo => (
                <div
                  key={photo.id}
                  className="group relative rounded-xl overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', aspectRatio: '1/1' }}
                >
                  <img
                    src={photo.thumbnail_url || photo.url}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-semibold truncate">{photo.filename}</p>
                      {photo.project_name && (
                        <p className="text-white/70 text-xs truncate">{photo.project_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {viewMode === 'list' && filteredPhotos.map(photo => (
                <div
                  key={photo.id}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}
                >
                  <img
                    src={photo.thumbnail_url || photo.url}
                    alt={photo.filename}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>{photo.filename}</h4>
                    <p className="text-xs truncate" style={{ color: '#4A4A4A' }}>{photo.project_name || 'No project'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {photo.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#F8F9FA', color: '#4A4A4A' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#4A4A4A' }}>{formatBytes(photo.file_size)}</p>
                    <p className="text-xs" style={{ color: '#4A4A4A' }}>
                      {new Date(photo.captured_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              {viewMode === 'map' && (
                <MapView photos={filteredPhotos} onPhotoClick={(photo) => console.log('Photo clicked:', photo)} />
              )}

              {viewMode === 'timeline' && (
                <TimelineView photos={filteredPhotos} onPhotoClick={(photo) => console.log('Photo clicked:', photo)} />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <PhotoUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={() => {
          loadPhotos()
          loadStats()
        }}
      />

      {/* Batch Upload Modal */}
      <BatchPhotoUpload
        isOpen={showBatchUpload}
        onClose={() => setShowBatchUpload(false)}
        onUploadComplete={() => {
          loadPhotos()
          loadStats()
        }}
      />
    </div>
  )
}
