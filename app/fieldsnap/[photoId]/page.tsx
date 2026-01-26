"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { punchListService } from '@/lib/punchlist'
import PunchListPanel from '@/components/fieldsnap/PunchListPanel'
import Link from 'next/link'

interface Photo {
  id: string
  user_id: string
  project_id: string | null
  url: string
  thumbnail_url: string
  filename: string
  file_size: number
  mime_type: string
  width: number
  height: number
  gps_latitude: number | null
  gps_longitude: number | null
  captured_at: string
  uploaded_at: string
  description: string | null
  tags: string[]
  ai_tags: string[]
  // AI analysis removed - was fake data
  // Real AI integration coming in future release
  weather_data: any
  blueprint_coordinates: any
  annotations: any[]
  status: 'pending' | 'approved' | 'rejected'
  project_name: string | null
}

export default function PhotoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [punchItems, setPunchItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)

  useEffect(() => {
    if (params.photoId) {
      loadPhotoData(params.photoId as string)
      loadPunchItems(params.photoId as string)
    }
  }, [params.photoId])

  const loadPhotoData = async (photoId: string) => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('media_assets')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('id', photoId)
        .single()

      if (error) throw error

      setPhoto({
        ...data,
        project_name: data.project?.name || null
      })
    } catch (err) {
      console.error('Error loading photo:', err)
      alert('Failed to load photo')
    } finally {
      setLoading(false)
    }
  }

  const loadPunchItems = async (photoId: string) => {
    try {
      const items = await punchListService.getItemsByPhoto(photoId)
      setPunchItems(items)
    } catch (err) {
      console.error('Error loading punch items:', err)
    }
  }

  const handlePunchItemUpdate = async () => {
    if (params.photoId) {
      await loadPunchItems(params.photoId as string)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: '#4A4A4A' }}>Loading photo...</p>
        </div>
      </div>
    )
  }

  if (!photo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <p className="text-2xl mb-4">📸</p>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>Photo Not Found</h2>
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>The photo you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => router.push('/fieldsnap')}
            className="px-6 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#FF6B6B' }}
          >
            Back to FieldSnap
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{photo.filename}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: '#6B7280' }}>
                  {photo.project_name && (
                    <>
                      <Link href={`/projects/${photo.project_id}`} className="hover:underline">
                        {photo.project_name}
                      </Link>
                      <span>•</span>
                    </>
                  )}
                  <span>{new Date(photo.captured_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{formatBytes(photo.file_size)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFullscreen(true)}
                className="px-4 py-2 rounded-lg border font-semibold hover:bg-gray-50"
                style={{ borderColor: '#E5E7EB', color: '#374151' }}
              >
                🔍 Fullscreen
              </button>
              <button
                onClick={() => window.open(photo.url, '_blank')}
                className="px-4 py-2 rounded-lg font-semibold text-white"
                style={{ backgroundColor: '#FF6B6B' }}
              >
                📥 Download
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photo View Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Viewer */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <img
                src={photo.url}
                alt={photo.filename}
                className="w-full h-auto"
                style={{ maxHeight: '70vh', objectFit: 'contain', backgroundColor: '#000' }}
              />
            </div>

            {/* Photo Metadata */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4" style={{ color: '#1A1A1A' }}>Photo Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#6B7280' }}>Dimensions</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>{photo.width} × {photo.height}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#6B7280' }}>File Size</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>{formatBytes(photo.file_size)}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#6B7280' }}>Captured</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                    {new Date(photo.captured_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#6B7280' }}>Uploaded</p>
                  <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                    {new Date(photo.uploaded_at).toLocaleString()}
                  </p>
                </div>

                {photo.gps_latitude && photo.gps_longitude && (
                  <div className="col-span-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: '#6B7280' }}>Location</p>
                    <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                      {photo.gps_latitude.toFixed(6)}, {photo.gps_longitude.toFixed(6)}
                    </p>
                  </div>
                )}

                {photo.description && (
                  <div className="col-span-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: '#6B7280' }}>Description</p>
                    <p className="font-semibold" style={{ color: '#1A1A1A' }}>{photo.description}</p>
                  </div>
                )}

                {photo.tags && photo.tags.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm font-semibold mb-2" style={{ color: '#6B7280' }}>Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {photo.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-sm font-semibold"
                          style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis - Removed fake functionality
                Real computer vision integration coming in future release */}
          </div>

          {/* Punch List Column */}
          <div className="lg:col-span-1">
            <PunchListPanel
              punchItems={punchItems}
              photoId={photo.id}
              projectId={photo.project_id || ''}
              onPunchItemUpdate={handlePunchItemUpdate}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={photo.url}
            alt={photo.filename}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
