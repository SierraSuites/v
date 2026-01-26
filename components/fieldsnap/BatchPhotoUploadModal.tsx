'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserCompany } from '@/lib/auth/get-user-company'
import * as exifr from 'exifr'

interface PhotoFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  metadata?: {
    location?: { lat: number; lng: number }
    timestamp?: string
    camera?: string
    dimensions?: { width: number; height: number }
  }
}

interface BatchPhotoUploadModalProps {
  projectId: string
  onClose: () => void
  onComplete: () => void
}

export default function BatchPhotoUploadModal({
  projectId,
  onClose,
  onComplete
}: BatchPhotoUploadModalProps) {
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [category, setCategory] = useState<string>('progress')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFiles = useCallback(async (fileList: FileList) => {
    const imageFiles = Array.from(fileList).filter(file =>
      file.type.startsWith('image/')
    )

    if (imageFiles.length === 0) {
      alert('Please select image files only')
      return
    }

    // Limit to 50 photos per batch
    if (imageFiles.length > 50) {
      alert('Maximum 50 photos per batch. Please select fewer files.')
      return
    }

    const newPhotos: PhotoFile[] = await Promise.all(
      imageFiles.map(async (file) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const preview = URL.createObjectURL(file)

        // Extract EXIF data
        let metadata: PhotoFile['metadata'] = undefined
        try {
          const tags = await exifr.parse(file)

          metadata = {
            location: tags.GPSLatitude && tags.GPSLongitude ? {
              lat: parseGPSCoordinate(tags.GPSLatitude.description),
              lng: parseGPSCoordinate(tags.GPSLongitude.description)
            } : undefined,
            timestamp: tags.DateTime?.description || tags.DateTimeOriginal?.description,
            camera: tags.Model?.description || undefined,
            dimensions: tags.ImageWidth && tags.ImageHeight ? {
              width: tags.ImageWidth.value,
              height: tags.ImageHeight.value
            } : undefined
          }
        } catch (error) {
          console.error('Failed to extract EXIF data:', error)
        }

        return {
          id,
          file,
          preview,
          status: 'pending' as const,
          progress: 0,
          metadata
        }
      })
    )

    setPhotos(prev => [...prev, ...newPhotos])
  }, [])

  // Parse GPS coordinates from EXIF format
  function parseGPSCoordinate(coord: string): number {
    const parts = coord.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([NSEW])/)
    if (!parts) return 0

    const degrees = parseFloat(parts[1])
    const minutes = parseFloat(parts[2])
    const seconds = parseFloat(parts[3])
    const direction = parts[4]

    let decimal = degrees + minutes / 60 + seconds / 3600

    if (direction === 'S' || direction === 'W') {
      decimal = -decimal
    }

    return decimal
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // Remove photo from list
  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id)
      if (photo?.preview) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter(p => p.id !== id)
    })
  }

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // Upload all photos
  const handleUpload = async () => {
    if (photos.length === 0) {
      alert('Please add photos first')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const profile = await getUserCompany()

      if (!profile) {
        throw new Error('Not authenticated')
      }

      // Upload photos one by one with progress tracking
      for (const photo of photos) {
        if (photo.status === 'success') continue

        setPhotos(prev => prev.map(p =>
          p.id === photo.id ? { ...p, status: 'uploading' as const } : p
        ))

        try {
          // Upload to Supabase Storage
          const timestamp = Date.now()
          const sanitizedName = photo.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `${projectId}/${timestamp}-${sanitizedName}`

          const { error: uploadError } = await supabase.storage
            .from('fieldsnap-photos')
            .upload(filePath, photo.file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('fieldsnap-photos')
            .getPublicUrl(filePath)

          // Save to database
          const { error: dbError } = await supabase
            .from('photos')
            .insert({
              project_id: projectId,
              company_id: profile.company_id,
              file_url: publicUrl,
              file_name: photo.file.name,
              file_size: photo.file.size,
              file_type: photo.file.type,
              category,
              tags: tags.length > 0 ? tags : null,
              latitude: photo.metadata?.location?.lat || null,
              longitude: photo.metadata?.location?.lng || null,
              captured_at: photo.metadata?.timestamp
                ? new Date(photo.metadata.timestamp).toISOString()
                : new Date().toISOString(),
              camera_make: photo.metadata?.camera || null,
              uploaded_by: profile.id
            })

          if (dbError) throw dbError

          setPhotos(prev => prev.map(p =>
            p.id === photo.id ? { ...p, status: 'success' as const, progress: 100 } : p
          ))
        } catch (error) {
          console.error('Failed to upload photo:', error)
          setPhotos(prev => prev.map(p =>
            p.id === photo.id ? {
              ...p,
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Upload failed'
            } : p
          ))
        }
      }

      // Check if all succeeded
      const allSuccess = photos.every(p => p.status === 'success')
      if (allSuccess) {
        onComplete()
        onClose()
      } else {
        alert('Some photos failed to upload. You can retry or remove them.')
      }
    } catch (error) {
      console.error('Batch upload failed:', error)
      alert('Batch upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Retry failed uploads
  const retryFailed = () => {
    setPhotos(prev => prev.map(p =>
      p.status === 'error' ? { ...p, status: 'pending' as const, progress: 0, error: undefined } : p
    ))
  }

  const pendingCount = photos.filter(p => p.status === 'pending').length
  const uploadingCount = photos.filter(p => p.status === 'uploading').length
  const successCount = photos.filter(p => p.status === 'success').length
  const errorCount = photos.filter(p => p.status === 'error').length
  const totalSize = photos.reduce((sum, p) => sum + p.file.size, 0) / (1024 * 1024) // MB

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Batch Photo Upload</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload multiple photos with automatic metadata extraction
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload Area */}
        {photos.length === 0 && (
          <div className="p-6">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">Drop Photos Here</p>
              <p className="text-sm text-gray-600 mb-4">
                Or click to browse (Max 50 photos, 50MB each)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose Photos
              </button>
            </div>
          </div>
        )}

        {/* Photos Grid */}
        {photos.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <span className="text-gray-700">
                  <strong>{photos.length}</strong> photos ({totalSize.toFixed(1)} MB)
                </span>
                {successCount > 0 && (
                  <span className="text-green-600">
                    <strong>{successCount}</strong> uploaded
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-600">
                    <strong>{errorCount}</strong> failed
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                + Add More
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Options */}
            <div className="px-6 py-4 border-b border-gray-200 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={uploading}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="progress">Progress Photo</option>
                  <option value="inspection">Inspection</option>
                  <option value="safety">Safety Issue</option>
                  <option value="defect">Defect</option>
                  <option value="completion">Completion</option>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (Optional)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..."
                    disabled={uploading}
                    className="flex-1 md:flex-none md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                  <button
                    onClick={addTag}
                    disabled={!newTag.trim() || uploading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          disabled={uploading}
                          className="hover:text-blue-900 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Photos Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                      <img
                        src={photo.preview}
                        alt={photo.file.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Status Overlay */}
                      {photo.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-white text-sm">{photo.progress.toFixed(0)}%</p>
                          </div>
                        </div>
                      )}

                      {photo.status === 'success' && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {photo.status === 'error' && (
                        <div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center p-2">
                          <p className="text-red-600 text-xs text-center">{photo.error}</p>
                        </div>
                      )}

                      {/* Remove Button */}
                      {!uploading && photo.status !== 'uploading' && (
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      {/* EXIF Badge */}
                      {photo.metadata?.location && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          GPS
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-600 truncate" title={photo.file.name}>
                      {photo.file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            {uploading ? (
              <span>Uploading {uploadingCount} of {photos.length} photos...</span>
            ) : errorCount > 0 ? (
              <button
                onClick={retryFailed}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Retry {errorCount} Failed Upload{errorCount > 1 ? 's' : ''}
              </button>
            ) : photos.length > 0 ? (
              <span>Ready to upload {pendingCount + errorCount} photo{pendingCount + errorCount !== 1 ? 's' : ''}</span>
            ) : null}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            {photos.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={uploading || photos.every(p => p.status === 'success')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  `Upload ${pendingCount + errorCount} Photo${pendingCount + errorCount !== 1 ? 's' : ''}`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
