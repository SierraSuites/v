"use client"

import { useState, useRef, useCallback } from 'react'
import { uploadPhotoFile, createPhoto, extractImageMetadata, generateThumbnail } from '@/lib/supabase/photos'

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: () => void
  projectId?: string
  projectName?: string
}

export default function PhotoUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  projectId,
  projectName
}: PhotoUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [captureSource, setCaptureSource] = useState<'camera' | 'upload' | 'drone' | 'mobile'>('upload')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form
  const resetForm = () => {
    setSelectedFiles([])
    setDescription('')
    setTags([])
    setTagInput('')
    setUploadProgress({})
    setCaptureSource('upload')
  }

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/')
      const isUnder50MB = file.size <= 50 * 1024 * 1024 // 50MB limit

      if (!isImage) {
        alert(`${file.name} is not an image file`)
        return false
      }
      if (!isUnder50MB) {
        alert(`${file.name} is larger than 50MB`)
        return false
      }
      return true
    })

    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [])

  // Remove file from selection
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // Handle tag input key press
  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // Upload photos
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one photo')
      return
    }

    setUploading(true)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const fileKey = file.name

        // Update progress
        setUploadProgress(prev => ({ ...prev, [fileKey]: 10 }))

        // Extract metadata
        const metadata = await extractImageMetadata(file)
        setUploadProgress(prev => ({ ...prev, [fileKey]: 30 }))

        // Generate thumbnail
        const thumbnailBlob = await generateThumbnail(file)
        setUploadProgress(prev => ({ ...prev, [fileKey]: 50 }))

        // Upload main file
        const { data: uploadData, error: uploadError } = await uploadPhotoFile(file)
        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        setUploadProgress(prev => ({ ...prev, [fileKey]: 70 }))

        // Upload thumbnail if generated
        let thumbnailUrl = null
        if (thumbnailBlob && uploadData) {
          const thumbnailFile = new File([thumbnailBlob], `thumb_${file.name}`, { type: 'image/jpeg' })
          const { data: thumbData } = await uploadPhotoFile(thumbnailFile, 'thumbnails')
          thumbnailUrl = thumbData?.fullPath || null
        }

        setUploadProgress(prev => ({ ...prev, [fileKey]: 90 }))

        // Create database record
        const { error: dbError } = await createPhoto({
          url: uploadData!.fullPath,
          thumbnail_url: thumbnailUrl,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          width: metadata.width || null,
          height: metadata.height || null,
          captured_at: metadata.capturedAt || new Date().toISOString(),
          uploaded_at: new Date().toISOString(),
          description: description || null,
          tags,
          ai_tags: [],
          gps_latitude: metadata.gpsLatitude || null,
          gps_longitude: metadata.gpsLongitude || null,
          gps_altitude: null,
          gps_heading: null,
          capture_source: captureSource,
          device_info: metadata.device ? { device: metadata.device } : null,
          project_id: projectId || null,
          project_name: projectName || null,
          status: 'pending',
          annotations_count: 0,
          ai_analysis: null,
          weather_data: null,
          blueprint_coordinates: null,
          reviewed_by: null,
          reviewed_at: null,
          uploader_name: null
        })

        if (dbError) {
          console.error('Database error:', dbError)
          alert(`Failed to save ${file.name} to database: ${dbError.message}`)
          continue
        }

        setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }))
      }

      // Success
      alert(`Successfully uploaded ${selectedFiles.length} photo(s)!`)
      resetForm()
      onUploadComplete?.()
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
      alert('An error occurred during upload. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0' }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Upload Photos</h2>
            <p className="text-sm mt-1" style={{ color: '#4A4A4A' }}>
              {projectName ? `to ${projectName}` : 'to your gallery'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={uploading}
          >
            <svg className="w-6 h-6" style={{ color: '#4A4A4A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
              dragActive ? 'border-[#FF6B6B] bg-[#FFF5F5]' : 'border-[#E0E0E0] hover:border-[#FF6B6B]'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFF5F5' }}>
                  <svg className="w-10 h-10" style={{ color: '#FF6B6B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
              </div>

              <div>
                <p className="text-lg font-semibold mb-1" style={{ color: '#1A1A1A' }}>
                  {dragActive ? 'Drop photos here' : 'Drop photos here or click to browse'}
                </p>
                <p className="text-sm" style={{ color: '#4A4A4A' }}>
                  Support for JPG, PNG, WEBP up to 50MB each
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white"
                  style={{ backgroundColor: '#FF6B6B' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  Browse Files
                </button>
              </div>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                Selected Photos ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#E0E0E0' }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>{file.name}</p>
                      <p className="text-xs" style={{ color: '#4A4A4A' }}>{formatFileSize(file.size)}</p>
                      {uploadProgress[file.name] !== undefined && (
                        <div className="w-full h-1 rounded-full mt-2" style={{ backgroundColor: '#E0E0E0' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${uploadProgress[file.name]}%`,
                              backgroundColor: '#6BCB77'
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: '#DC2626' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1A1A1A' }}>
                Capture Source
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: 'upload', label: 'Upload', icon: '📁' },
                  { value: 'camera', label: 'Camera', icon: '📷' },
                  { value: 'mobile', label: 'Mobile', icon: '📱' },
                  { value: 'drone', label: 'Drone', icon: '🚁' }
                ].map(source => (
                  <button
                    key={source.value}
                    type="button"
                    onClick={() => setCaptureSource(source.value as any)}
                    className={`p-3 rounded-lg font-semibold text-sm transition-all ${
                      captureSource === source.value
                        ? 'text-white'
                        : 'hover:bg-gray-100'
                    }`}
                    style={{
                      backgroundColor: captureSource === source.value ? '#FF6B6B' : '#F8F9FA',
                      border: `1px solid ${captureSource === source.value ? '#FF6B6B' : '#E0E0E0'}`,
                      color: captureSource === source.value ? '#FFFFFF' : '#1A1A1A'
                    }}
                  >
                    <span className="mr-2">{source.icon}</span>
                    {source.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1A1A1A' }}>
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for all photos..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1A1A1A' }}>
                Tags (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Add tag and press Enter"
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white"
                  style={{ backgroundColor: '#FF6B6B' }}
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-4 p-6" style={{ backgroundColor: '#F8F9FA', borderTop: '1px solid #E0E0E0' }}>
          <p className="text-sm" style={{ color: '#4A4A4A' }}>
            {selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{ backgroundColor: '#E0E0E0', color: '#1A1A1A' }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </span>
              ) : (
                `Upload ${selectedFiles.length} Photo${selectedFiles.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
