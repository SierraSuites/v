"use client"

import { useMemo } from 'react'
import { type Photo } from '@/lib/supabase/photos'

interface TimelineViewProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
}

interface GroupedPhotos {
  date: string
  displayDate: string
  photos: Photo[]
  stats: {
    total: number
    avgQuality: number
    projects: Set<string>
  }
}

export default function TimelineView({ photos, onPhotoClick }: TimelineViewProps) {
  // Group photos by date
  const groupedPhotos = useMemo(() => {
    const groups = new Map<string, GroupedPhotos>()

    photos.forEach(photo => {
      const date = new Date(photo.captured_at)
      const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
      const displayDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          displayDate,
          photos: [],
          stats: {
            total: 0,
            avgQuality: 0,
            projects: new Set()
          }
        })
      }

      const group = groups.get(dateKey)!
      group.photos.push(photo)
      group.stats.total++
      if (photo.project_name) {
        group.stats.projects.add(photo.project_name)
      }
    })

    // Calculate average quality for each group
    groups.forEach(group => {
      const qualityScores = group.photos
        .filter(p => p.ai_analysis?.quality_score)
        .map(p => p.ai_analysis!.quality_score)

      group.stats.avgQuality = qualityScores.length > 0
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
        : 0
    })

    // Sort by date descending (newest first)
    return Array.from(groups.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [photos])

  if (photos.length === 0) {
    return (
      <div className="w-full py-16 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>No Photos Yet</h3>
        <p style={{ color: '#6B7280' }}>Upload photos to see your project timeline</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groupedPhotos.map((group, groupIndex) => (
        <div key={group.date} className="relative">
          {/* Timeline connector */}
          {groupIndex < groupedPhotos.length - 1 && (
            <div
              className="absolute left-6 top-24 bottom-0 w-0.5"
              style={{ backgroundColor: '#E0E0E0' }}
            />
          )}

          {/* Date header */}
          <div className="flex items-start gap-4 mb-4">
            {/* Timeline dot */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white shadow-lg z-10"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              <span className="text-xl">📸</span>
            </div>

            {/* Date info */}
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1" style={{ color: '#1A1A1A' }}>
                {group.displayDate}
              </h3>
              <div className="flex flex-wrap gap-4 text-sm" style={{ color: '#6B7280' }}>
                <span>📸 {group.stats.total} photo{group.stats.total !== 1 ? 's' : ''}</span>
                {group.stats.projects.size > 0 && (
                  <span>📁 {group.stats.projects.size} project{group.stats.projects.size !== 1 ? 's' : ''}</span>
                )}
                {group.stats.avgQuality > 0 && (
                  <span className="flex items-center gap-1">
                    ⭐ Quality: {group.stats.avgQuality}/100
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Photos grid */}
          <div className="ml-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {group.photos.map(photo => (
              <div
                key={photo.id}
                className="group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-105"
                onClick={() => onPhotoClick?.(photo)}
                style={{ backgroundColor: '#F8F9FA' }}
              >
                {/* Photo thumbnail */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={photo.thumbnail_url || photo.url}
                    alt={photo.filename}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-4xl">🔍</span>
                    </div>
                  </div>

                  {/* Quality badge */}
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
                </div>

                {/* Photo info */}
                <div className="p-3">
                  <p
                    className="text-sm font-semibold truncate mb-1"
                    style={{ color: '#1A1A1A' }}
                  >
                    {photo.filename}
                  </p>
                  {photo.project_name && (
                    <p className="text-xs truncate mb-2" style={{ color: '#6B7280' }}>
                      📁 {photo.project_name}
                    </p>
                  )}
                  {photo.description && (
                    <p
                      className="text-xs line-clamp-2 mb-2"
                      style={{ color: '#6B7280' }}
                    >
                      {photo.description}
                    </p>
                  )}
                  {photo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
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
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ color: '#6B7280' }}
                        >
                          +{photo.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress indicator for the day (if multiple projects) */}
          {group.stats.projects.size > 1 && (
            <div className="ml-16 mt-4 p-4 rounded-xl border" style={{ backgroundColor: '#F8F9FA', borderColor: '#E0E0E0' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#1A1A1A' }}>
                Projects Active This Day:
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(group.stats.projects).map(project => (
                  <span
                    key={project}
                    className="px-3 py-1 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: '#FFE5E5', color: '#FF6B6B' }}
                  >
                    {project}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Summary footer */}
      <div className="ml-16 p-6 rounded-xl border-2 border-dashed" style={{ borderColor: '#E0E0E0', backgroundColor: '#F8F9FA' }}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">🎯</span>
          <div>
            <h4 className="font-bold mb-1" style={{ color: '#1A1A1A' }}>Timeline Summary</h4>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Showing {photos.length} photos across {groupedPhotos.length} days
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
