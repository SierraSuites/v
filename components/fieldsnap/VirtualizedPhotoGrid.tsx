"use client"

import { memo, useState, useCallback } from 'react'
// @ts-ignore - react-window types are not working correctly
import { FixedSizeGrid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { type Photo } from '@/lib/supabase/photos'

interface VirtualizedPhotoGridProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
  columnCount?: number
  itemSize?: number
}

// Memoized Photo Card Component
const PhotoCard = memo(({ photo, onClick, style }: {
  photo: Photo
  onClick?: (photo: Photo) => void
  style: React.CSSProperties
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#6BCB77'
      case 'rejected': return '#DC2626'
      default: return '#F59E0B'
    }
  }

  return (
    <div style={{...style, padding: '8px'}}>
      <div
        onClick={() => onClick?.(photo)}
        className="group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-105 h-full"
        style={{ backgroundColor: '#F8F9FA' }}
      >
        {/* Image */}
        <div className="aspect-square relative overflow-hidden">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: '#E5E7EB' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">📸</span>
              </div>
            </div>
          )}

          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
              <span className="text-4xl">❌</span>
            </div>
          ) : (
            <img
              src={photo.thumbnail_url || photo.url}
              alt={photo.filename}
              className={`w-full h-full object-cover transition-all ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-4xl">🔍</span>
            </div>
          </div>

          {/* Status badge */}
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold text-white shadow-lg"
            style={{ backgroundColor: getStatusColor(photo.status) }}
          >
            {photo.status}
          </div>

          {/* Quality score badge */}
          {photo.ai_analysis?.quality_score && (
            <div
              className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white shadow-lg"
              style={{
                backgroundColor:
                  photo.ai_analysis.quality_score >= 80
                    ? '#6BCB77'
                    : photo.ai_analysis.quality_score >= 60
                    ? '#F59E0B'
                    : '#DC2626',
              }}
            >
              {photo.ai_analysis.quality_score}
            </div>
          )}

          {/* Alert badges */}
          {(photo.ai_analysis?.defects && photo.ai_analysis.defects.length > 0) && (
            <div
              className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-bold text-white shadow-lg"
              style={{ backgroundColor: '#DC2626' }}
            >
              ⚠️ {photo.ai_analysis.defects.length} Defect{photo.ai_analysis.defects.length !== 1 ? 's' : ''}
            </div>
          )}

          {(photo.ai_analysis?.safety_issues && photo.ai_analysis.safety_issues.length > 0) && (
            <div
              className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-bold text-white shadow-lg"
              style={{ backgroundColor: '#F59E0B' }}
            >
              🚨 {photo.ai_analysis.safety_issues.length}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p
            className="text-sm font-semibold truncate mb-1"
            style={{ color: '#1A1A1A' }}
            title={photo.filename}
          >
            {photo.filename}
          </p>
          <div className="flex items-center justify-between text-xs" style={{ color: '#6B7280' }}>
            <span>{formatFileSize(photo.file_size)}</span>
            <span>{new Date(photo.captured_at).toLocaleDateString()}</span>
          </div>
          {photo.project_name && (
            <p className="text-xs truncate mt-1" style={{ color: '#6B7280' }}>
              📁 {photo.project_name}
            </p>
          )}
          {photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {photo.tags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-xs font-semibold"
                  style={{ backgroundColor: '#FFE5E5', color: '#FF6B6B' }}
                >
                  {tag}
                </span>
              ))}
              {photo.tags.length > 2 && (
                <span className="text-xs" style={{ color: '#6B7280' }}>
                  +{photo.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

PhotoCard.displayName = 'PhotoCard'

// Virtualized Grid Component
export default function VirtualizedPhotoGrid({
  photos,
  onPhotoClick,
  columnCount: initialColumnCount,
  itemSize = 300
}: VirtualizedPhotoGridProps) {
  const calculateColumnCount = useCallback((width: number) => {
    if (initialColumnCount) return initialColumnCount
    if (width < 640) return 2
    if (width < 768) return 3
    if (width < 1024) return 4
    if (width < 1280) return 5
    return 6
  }, [initialColumnCount])

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <span className="text-6xl mb-4">📷</span>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
          No Photos Yet
        </h3>
        <p style={{ color: '#6B7280' }}>Upload your first photo to get started</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }) => {
          const columnCount = calculateColumnCount(width)
          const rowCount = Math.ceil(photos.length / columnCount)

          const Cell = ({ columnIndex, rowIndex, style }: any) => {
            const index = rowIndex * columnCount + columnIndex
            if (index >= photos.length) return null

            const photo = photos[index]
            return (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={onPhotoClick}
                style={style}
              />
            )
          }

          return (
            <FixedSizeGrid
              columnCount={columnCount}
              columnWidth={itemSize}
              height={height}
              rowCount={rowCount}
              rowHeight={itemSize + 100} // Extra height for info section
              width={width}
              overscanRowCount={2}
            >
              {Cell}
            </FixedSizeGrid>
          )
        }}
      </AutoSizer>
    </div>
  )
}
