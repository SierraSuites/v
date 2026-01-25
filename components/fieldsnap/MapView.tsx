"use client"

import { useEffect, useRef, useState } from 'react'

interface Photo {
  id: string
  url: string
  thumbnail_url: string
  filename: string
  gps_latitude: number | null
  gps_longitude: number | null
  description: string | null
  captured_at: string
  project_name: string | null
  tags: string[]
}

interface MapViewProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
}

export default function MapView({ photos, onPhotoClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  // Filter photos with GPS coordinates
  const geoPhotos = photos.filter(p => p.gps_latitude && p.gps_longitude)

  useEffect(() => {
    // Initialize map when component mounts
    if (mapRef.current && geoPhotos.length > 0) {
      initializeMap()
    }
  }, [geoPhotos])

  const initializeMap = () => {
    // This would integrate with Mapbox or Google Maps
    // For now, showing a functional placeholder
    console.log('Map would show', geoPhotos.length, 'photo markers')
  }

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo)
    if (onPhotoClick) {
      onPhotoClick(photo)
    }
  }

  if (geoPhotos.length === 0) {
    return (
      <div className="w-full h-[600px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4" style={{ borderColor: '#E0E0E0', backgroundColor: '#F8F9FA' }}>
        <div className="text-6xl">📍</div>
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>No GPS-Tagged Photos</h3>
          <p style={{ color: '#6B7280' }}>
            Photos with location data will appear on the map.<br />
            Enable GPS capture when uploading photos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden border relative" style={{ borderColor: '#E0E0E0' }}>
      {/* Simple map placeholder - replace with actual map library */}
      <div ref={mapRef} className="w-full h-full relative" style={{ backgroundColor: '#E5E7EB' }}>
        {/* Map grid background */}
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-20">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="border" style={{ borderColor: '#9CA3AF' }} />
          ))}
        </div>

        {/* Photo markers - positioned based on relative coordinates */}
        <div className="absolute inset-0 p-8">
          {geoPhotos.map((photo, index) => {
            // Simple distribution for demo (replace with actual lat/lng positioning)
            const left = `${(index % 5) * 20 + 10}%`
            const top = `${Math.floor(index / 5) * 20 + 10}%`

            return (
              <div
                key={photo.id}
                className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-110"
                style={{ left, top }}
                onClick={() => handlePhotoClick(photo)}
              >
                {/* Map pin */}
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full border-4 border-white shadow-lg overflow-hidden"
                    style={{ backgroundColor: '#FF6B6B' }}
                  >
                    <img
                      src={photo.thumbnail_url || photo.url}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderTop: '12px solid #FF6B6B',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Info banner */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-6 py-3 border" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                {geoPhotos.length} GPS-Tagged Photo{geoPhotos.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Click a marker to view details
              </p>
            </div>
          </div>
        </div>

        {/* Integration notice */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 border-2 border-yellow-400 rounded-lg px-4 py-2">
          <p className="text-xs font-semibold" style={{ color: '#92400E' }}>
            💡 To enable real maps, configure NEXT_PUBLIC_MAPBOX_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
        </div>
      </div>

      {/* Selected photo popup */}
      {selectedPhoto && (
        <div className="absolute bottom-4 right-4 w-80 bg-white rounded-xl shadow-2xl border overflow-hidden" style={{ borderColor: '#E0E0E0' }}>
          <div className="relative h-48">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.filename}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="text-xl font-bold" style={{ color: '#4A4A4A' }}>×</span>
            </button>
          </div>
          <div className="p-4">
            <h4 className="font-bold mb-2" style={{ color: '#1A1A1A' }}>{selectedPhoto.filename}</h4>
            {selectedPhoto.description && (
              <p className="text-sm mb-3" style={{ color: '#6B7280' }}>{selectedPhoto.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedPhoto.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded text-xs font-semibold"
                  style={{ backgroundColor: '#FFE5E5', color: '#FF6B6B' }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
              <p>📍 {selectedPhoto.gps_latitude?.toFixed(6)}, {selectedPhoto.gps_longitude?.toFixed(6)}</p>
              <p>📅 {new Date(selectedPhoto.captured_at).toLocaleDateString()}</p>
              {selectedPhoto.project_name && <p>📁 {selectedPhoto.project_name}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
