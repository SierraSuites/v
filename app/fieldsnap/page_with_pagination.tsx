"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPhotos, subscribeToPhotos, getStorageStats, type Photo, type PaginatedResult } from '@/lib/supabase/photos'
import PhotoUploadModal from '@/components/fieldsnap/PhotoUploadModal'
import { useToast } from '@/components/ToastNotification'
import MapView from '@/components/fieldsnap/MapView'
import TimelineView from '@/components/fieldsnap/TimelineView'
import VirtualizedPhotoGrid from '@/components/fieldsnap/VirtualizedPhotoGrid'
import FieldSnapPagination from '@/components/fieldsnap/FieldSnapPagination'

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
  const searchParams = useSearchParams()
  const toast = useToast()

  // User and auth
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Photos and stats
  const [photos, setPhotos] = useState<Photo[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalPhotos: 0,
    todayUploads: 0,
    storageUsed: 0,
    storageTotal: 10 * 1024 * 1024 * 1024,
    activeProjects: 0
  })

  // Pagination state - Initialize from URL params
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams?.get('page')
    return page ? parseInt(page, 10) : 1
  })
  const [pageSize, setPageSize] = useState(() => {
    const limit = searchParams?.get('limit')
    return limit ? parseInt(limit, 10) : 20
  })
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map' | 'timeline'>(() => {
    const view = searchParams?.get('view')
    return (view as any) || 'grid'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // UI states
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Update URL when pagination changes
  const updateURL = useCallback((page: number, limit: number, view: string) => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', limit.toString())
    params.set('view', view)
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router])

  // Load user
  useEffect(() => {
    loadUser()
  }, [])

  // Load photos when user or pagination changes
  useEffect(() => {
    if (user) {
      loadPhotos()
      loadStats()
    }
  }, [user, currentPage, pageSize, sortBy])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToPhotos((payload) => {
      if (payload.eventType === 'INSERT') {
        // Reload current page to maintain pagination
        loadPhotos()
        loadStats()
        toast.success('New photo uploaded')
      } else if (payload.eventType === 'UPDATE') {
        setPhotos(prev => prev.map(p => p.id === payload.new.id ? payload.new as Photo : p))
      } else if (payload.eventType === 'DELETE') {
        loadPhotos()
        loadStats()
        toast.info('Photo deleted')
      }
    })

    return () => {
      unsubscribe()
    }
  }, [user, currentPage, pageSize])

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
    setLoading(true)

    const sortField = sortBy === 'newest' ? 'captured_at' :
                     sortBy === 'oldest' ? 'captured_at' :
                     sortBy === 'size' ? 'file_size' : 'captured_at'
    const sortOrder = sortBy === 'oldest' ? 'asc' : 'desc'

    const result = await getPhotos({
      page: currentPage,
      pageSize,
      sortBy: sortField,
      sortOrder
    })

    if (result.error) {
      console.error('Error loading photos:', result.error)
      toast.error('Failed to load photos')
    } else if (result.data) {
      setPhotos(result.data)
      setTotalItems(result.pagination.totalItems)
      setTotalPages(result.pagination.totalPages)
    }

    setLoading(false)
  }

  const loadStats = async () => {
    const storageResult = await getStorageStats()
    if (storageResult.data) {
      setStats(prev => ({
        ...prev,
        storageUsed: storageResult.data.used,
        storageTotal: storageResult.data.total
      }))
    }

    // Calculate stats from photos
    setStats(prev => ({
      ...prev,
      totalPhotos: totalItems,
      todayUploads: photos.filter(p => {
        const uploadDate = new Date(p.uploaded_at)
        const today = new Date()
        return uploadDate.toDateString() === today.toDateString()
      }).length
      // AI stats removed - were displaying fake data
    }))
  }

  // Handle pagination changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    updateURL(page, pageSize, viewMode)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pageSize, viewMode, updateURL])

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page
    updateURL(1, newPageSize, viewMode)
  }, [viewMode, updateURL])

  // Filtered and sorted photos (client-side filtering for current page)
  const filteredPhotos = useMemo(() => {
    let filtered = photos

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
      filtered = filtered.filter(photo => photo.project_id === selectedProject)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(photo => photo.status === statusFilter)
    }

    // Tag filter
    if (tagFilter !== 'all') {
      filtered = filtered.filter(photo =>
        photo.tags.includes(tagFilter) || photo.ai_tags.includes(tagFilter)
      )
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()

      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7)
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1)
      }

      filtered = filtered.filter(photo =>
        new Date(photo.captured_at) >= filterDate
      )
    }

    return filtered
  }, [photos, searchQuery, selectedProject, statusFilter, tagFilter, dateFilter])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-200 rounded-full mx-auto mb-4" style={{ borderTopColor: '#FF6B6B' }} />
          <p style={{ color: '#6B7280' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Sidebar - Simplified for pagination demo */}
      <aside
        className={`${sidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-white border-r hidden lg:block`}
        style={{ borderColor: '#E0E0E0' }}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold" style={{ color: '#FF6B6B' }}>
            {sidebarCollapsed ? 'FS' : 'FieldSnap'}
          </h2>
        </div>
        <nav className="mt-6">
          <Link href="/fieldsnap" className="flex items-center gap-3 px-6 py-3 transition-colors" style={{ backgroundColor: '#FFE5E5', color: '#FF6B6B' }}>
            <span className="text-xl">📸</span>
            {!sidebarCollapsed && <span className="font-semibold">Photos</span>}
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header with Stats */}
        <div className="bg-white border-b p-6" style={{ borderColor: '#E0E0E0' }}>
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6" style={{ color: '#1A1A1A' }}>FieldSnap Media Hub</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: '#F8F9FA', borderColor: '#E0E0E0' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">📸</span>
                  <span className="text-sm font-semibold" style={{ color: '#6B7280' }}>Total Photos</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{stats.totalPhotos}</p>
              </div>

            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search photos, tags, descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pr-10 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E0E0E0', focusRingColor: '#FF6B6B' }}
                />
                <span className="absolute right-3 top-2.5 text-xl">🔍</span>
              </div>

              {/* View Modes */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewMode('grid')
                    updateURL(currentPage, pageSize, 'grid')
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'grid' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  style={{ backgroundColor: viewMode === 'grid' ? '#FF6B6B' : 'transparent' }}
                >
                  Grid
                </button>
                <button
                  onClick={() => {
                    setViewMode('list')
                    updateURL(currentPage, pageSize, 'list')
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'list' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  style={{ backgroundColor: viewMode === 'list' ? '#FF6B6B' : 'transparent' }}
                >
                  List
                </button>
                <button
                  onClick={() => {
                    setViewMode('map')
                    updateURL(currentPage, pageSize, 'map')
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'map' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  style={{ backgroundColor: viewMode === 'map' ? '#FF6B6B' : 'transparent' }}
                >
                  Map
                </button>
                <button
                  onClick={() => {
                    setViewMode('timeline')
                    updateURL(currentPage, pageSize, 'timeline')
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'timeline' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  style={{ backgroundColor: viewMode === 'timeline' ? '#FF6B6B' : 'transparent' }}
                >
                  Timeline
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 rounded-lg text-white font-semibold transition-transform hover:scale-105"
                style={{ backgroundColor: '#FF6B6B' }}
              >
                + Upload Photos
              </button>
            </div>
          </div>
        </div>

        {/* Photos Display Area */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin w-12 h-12 border-4 border-gray-200 rounded-full mx-auto mb-4" style={{ borderTopColor: '#FF6B6B' }} />
                <p style={{ color: '#6B7280' }}>Loading photos...</p>
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-6xl block mb-4">📷</span>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>No Photos Found</h3>
                <p style={{ color: '#6B7280' }}>Try adjusting your filters or upload some photos</p>
              </div>
            ) : (
              <>
                {viewMode === 'grid' && (
                  <div className="h-[calc(100vh-400px)]">
                    <VirtualizedPhotoGrid
                      photos={filteredPhotos}
                      onPhotoClick={(photo) => console.log('Photo clicked:', photo)}
                    />
                  </div>
                )}

                {viewMode === 'list' && (
                  <div className="space-y-2">
                    {filteredPhotos.map(photo => (
                      <div key={photo.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:shadow-md transition-shadow" style={{ borderColor: '#E0E0E0' }}>
                        <img src={photo.thumbnail_url || photo.url} alt={photo.filename} className="w-16 h-16 rounded object-cover" />
                        <div className="flex-1">
                          <p className="font-semibold" style={{ color: '#1A1A1A' }}>{photo.filename}</p>
                          <p className="text-sm" style={{ color: '#6B7280' }}>{formatBytes(photo.file_size)} • {new Date(photo.captured_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewMode === 'map' && (
                  <MapView photos={filteredPhotos} onPhotoClick={(photo) => console.log('Photo clicked:', photo)} />
                )}

                {viewMode === 'timeline' && (
                  <TimelineView photos={filteredPhotos} onPhotoClick={(photo) => console.log('Photo clicked:', photo)} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Pagination - Only show for grid and list views */}
        {(viewMode === 'grid' || viewMode === 'list') && !loading && filteredPhotos.length > 0 && (
          <FieldSnapPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
          />
        )}
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
    </div>
  )
}
