'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { PhotoIcon } from '@heroicons/react/24/outline'

interface Photo {
  id: string
  url: string
  filename: string
  captured_at: string
  project_name?: string
}

export default function ClientPortalPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/client-portal/photos')
      .then(r => r.ok ? r.json() : { photos: [] })
      .then(d => setPhotos(d.photos || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Project Photos</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No photos shared yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map(photo => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="group block">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <Image
                  src={photo.url}
                  alt={photo.filename}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500 truncate">{photo.filename}</p>
              <p className="text-xs text-gray-400">{new Date(photo.captured_at).toLocaleDateString()}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
