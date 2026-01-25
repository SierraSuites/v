"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BeforeAfterComparisonProps {
  punchItem: {
    id: string
    title: string
    photo_id: string // Original "before" photo
    proof_photo_id?: string | null // "After" photo
    status: string
    severity: 'critical' | 'major' | 'minor'
  }
}

interface Photo {
  id: string
  url: string
  filename: string
  captured_at: string
}

export default function BeforeAfterComparison({ punchItem }: BeforeAfterComparisonProps) {
  const [beforePhoto, setBeforePhoto] = useState<Photo | null>(null)
  const [afterPhoto, setAfterPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sliderPosition, setSliderPosition] = useState(50) // Percentage for split view
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side' | 'slider'>('side-by-side')
  const [showFullscreen, setShowFullscreen] = useState(false)

  useEffect(() => {
    loadPhotos()
  }, [punchItem])

  const loadPhotos = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Load before photo
      const { data: beforeData } = await supabase
        .from('media_assets')
        .select('id, url, filename, captured_at')
        .eq('id', punchItem.photo_id)
        .single()

      if (beforeData) {
        setBeforePhoto(beforeData)
      }

      // Load after photo if exists
      if (punchItem.proof_photo_id) {
        const { data: afterData } = await supabase
          .from('media_assets')
          .select('id, url, filename, captured_at')
          .eq('id', punchItem.proof_photo_id)
          .single()

        if (afterData) {
          setAfterPhoto(afterData)
        }
      }
    } catch (error) {
      console.error('Error loading photos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-lg" style={{ backgroundColor: '#F3F4F6' }} />
          <div className="h-4 rounded" style={{ backgroundColor: '#F3F4F6' }} />
        </div>
      </div>
    )
  }

  if (!beforePhoto) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <p className="text-sm text-center" style={{ color: '#6B7280' }}>
          Before photo not found
        </p>
      </div>
    )
  }

  const hasAfterPhoto = !!afterPhoto

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{
                backgroundColor: hasAfterPhoto ? '#D1FAE5' : '#FEE2E2'
              }}
            >
              {hasAfterPhoto ? '📸' : '⏳'}
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
                {hasAfterPhoto ? 'Before & After Comparison' : 'Before Photo'}
              </h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {hasAfterPhoto
                  ? 'Review the progress made on this issue'
                  : 'Upload proof photo to see comparison'}
              </p>
            </div>
          </div>

          {hasAfterPhoto && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'side-by-side' ? 'text-white' : 'hover:bg-gray-100'
                }`}
                style={{ backgroundColor: viewMode === 'side-by-side' ? '#FF6B6B' : 'transparent' }}
              >
                Side by Side
              </button>
              <button
                onClick={() => setViewMode('slider')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'slider' ? 'text-white' : 'hover:bg-gray-100'
                }`}
                style={{ backgroundColor: viewMode === 'slider' ? '#FF6B6B' : 'transparent' }}
              >
                Slider
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Comparison */}
      <div className="p-6">
        {!hasAfterPhoto ? (
          /* Before Photo Only */
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: '#000' }}>
              <img
                src={beforePhoto.url}
                alt={beforePhoto.filename}
                className="w-full h-auto max-h-96 object-contain mx-auto"
              />
              <div className="absolute top-4 left-4">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                >
                  🔴 BEFORE - Issue Detected
                </span>
              </div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#92400E' }}>
                ⏳ Awaiting Proof Photo
              </p>
              <p className="text-xs" style={{ color: '#78350F' }}>
                Upload a proof photo when work is complete to create a before/after comparison
              </p>
            </div>
          </div>
        ) : viewMode === 'side-by-side' ? (
          /* Side by Side View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: '#DC2626' }}>🔴 BEFORE</span>
                <span className="text-xs" style={{ color: '#6B7280' }}>
                  {new Date(beforePhoto.captured_at).toLocaleDateString()}
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border-2" style={{ borderColor: '#DC2626', backgroundColor: '#000' }}>
                <img
                  src={beforePhoto.url}
                  alt="Before"
                  className="w-full h-64 object-cover cursor-pointer"
                  onClick={() => setShowFullscreen(true)}
                />
              </div>
            </div>

            {/* After */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: '#10B981' }}>🟢 AFTER</span>
                <span className="text-xs" style={{ color: '#6B7280' }}>
                  {new Date(afterPhoto.captured_at).toLocaleDateString()}
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border-2" style={{ borderColor: '#10B981', backgroundColor: '#000' }}>
                <img
                  src={afterPhoto.url}
                  alt="After"
                  className="w-full h-64 object-cover cursor-pointer"
                  onClick={() => setShowFullscreen(true)}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Slider View */
          <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: '#000' }}>
            <div className="relative h-96">
              {/* After Photo (bottom layer) */}
              <img
                src={afterPhoto.url}
                alt="After"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Before Photo (top layer with clip) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={beforePhoto.url}
                  alt="Before"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>

              {/* Slider Control */}
              <div
                className="absolute top-0 bottom-0 w-1 cursor-ew-resize z-10"
                style={{ left: `${sliderPosition}%`, backgroundColor: '#FFFFFF' }}
                onMouseDown={(e) => {
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const rect = e.currentTarget.parentElement?.getBoundingClientRect()
                    if (rect) {
                      const x = moveEvent.clientX - rect.left
                      const percentage = (x / rect.width) * 100
                      setSliderPosition(Math.max(0, Math.min(100, percentage)))
                    }
                  }

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }

                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              >
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                >
                  🔴 BEFORE
                </span>
              </div>
              <div className="absolute top-4 right-4">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
                >
                  🟢 AFTER
                </span>
              </div>
            </div>

            <div className="p-4 text-center" style={{ backgroundColor: '#F8F9FA' }}>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                💡 Drag the slider to compare before and after
              </p>
            </div>
          </div>
        )}

        {/* Status Summary */}
        {hasAfterPhoto && (
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#D1FAE5', border: '1px solid #6BCB77' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <p className="font-bold text-sm" style={{ color: '#065F46' }}>
                  Work Completed Successfully
                </p>
                <p className="text-xs mt-1" style={{ color: '#047857' }}>
                  Proof photo uploaded on {new Date(afterPhoto.captured_at).toLocaleDateString()} -{' '}
                  Issue has been resolved and documented
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && hasAfterPhoto && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl w-full">
            <div className="space-y-2">
              <span className="text-white font-bold text-sm">🔴 BEFORE</span>
              <img
                src={beforePhoto.url}
                alt="Before"
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <span className="text-white font-bold text-sm">🟢 AFTER</span>
              <img
                src={afterPhoto.url}
                alt="After"
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
