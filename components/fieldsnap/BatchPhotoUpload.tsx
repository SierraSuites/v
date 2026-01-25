'use client'

// ============================================================================
// BATCH PHOTO UPLOAD COMPONENT
// Handles multiple photo uploads with parallel processing, progress tracking,
// and enhanced error handling
// ============================================================================

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Upload, CheckCircle, AlertCircle, Loader2, Pause, Play, Trash2 } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface BatchUploadFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'paused'
  progress: number
  error?: string
  url?: string
  thumbnailUrl?: string
}

interface BatchPhotoUploadProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: () => void
  projectId?: string
}

interface UploadStats {
  total: number
  completed: number
  failed: number
  pending: number
  uploading: number
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BatchPhotoUpload({
  isOpen,
  onClose,
  onUploadComplete,
  projectId
}: BatchPhotoUploadProps) {
  // State
  const [files, setFiles] = useState<BatchUploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Batch settings
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [maxConcurrent, setMaxConcurrent] = useState(3) // Upload 3 files at once

  // Abort controllers for cancellation
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  // ============================================================================
  // FILE MANAGEMENT
  // ============================================================================

  const handleFileSelect = useCallback((fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: BatchUploadFile[] = []

    Array.from(fileList).forEach(file => {
      // Validate file
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`)
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        alert(`${file.name} exceeds 50MB limit`)
        return
      }

      // Create preview
      const preview = URL.createObjectURL(file)

      newFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        preview,
        status: 'pending',
        progress: 0
      })
    })

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      // Cancel upload if in progress
      const controller = abortControllersRef.current.get(id)
      if (controller) {
        controller.abort()
        abortControllersRef.current.delete(id)
      }
      return prev.filter(f => f.id !== id)
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setFiles(prev => {
      const toRemove = prev.filter(f => f.status === 'completed')
      toRemove.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview)
      })
      return prev.filter(f => f.status !== 'completed')
    })
  }, [])

  const clearAll = useCallback(() => {
    files.forEach(file => {
      if (file.preview) URL.revokeObjectURL(file.preview)
      const controller = abortControllersRef.current.get(file.id)
      if (controller) controller.abort()
    })
    setFiles([])
    abortControllersRef.current.clear()
  }, [files])

  // ============================================================================
  // DRAG & DROP
  // ============================================================================

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
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // ============================================================================
  // TAG MANAGEMENT
  // ============================================================================

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
      setTagInput('')
    }
  }, [tagInput, tags])

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }, [])

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  // ============================================================================
  // UPLOAD LOGIC
  // ============================================================================

  const uploadSingleFile = async (uploadFile: BatchUploadFile): Promise<void> => {
    const supabase = createClient()
    const controller = new AbortController()
    abortControllersRef.current.set(uploadFile.id, controller)

    try {
      // Update status
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ))

      // 1. Extract metadata (10%)
      const metadata = await extractMetadata(uploadFile.file)
      if (controller.signal.aborted) return

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 10 } : f
      ))

      // 2. Generate thumbnail (30%)
      const thumbnailBlob = await generateThumbnail(uploadFile.file)
      if (controller.signal.aborted) return

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 30 } : f
      ))

      // 3. Upload main image (60%)
      const filePath = `photos/${Date.now()}-${uploadFile.file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(filePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError
      if (controller.signal.aborted) return

      const { data: { publicUrl } } = supabase.storage
        .from('media-assets')
        .getPublicUrl(filePath)

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 60, url: publicUrl } : f
      ))

      // 4. Upload thumbnail (75%)
      let thumbnailUrl = publicUrl
      if (thumbnailBlob) {
        const thumbPath = `thumbnails/${Date.now()}-thumb-${uploadFile.file.name}`
        const thumbFile = new File([thumbnailBlob], `thumb-${uploadFile.file.name}`, { type: 'image/jpeg' })

        const { data: thumbData } = await supabase.storage
          .from('media-assets')
          .upload(thumbPath, thumbFile)

        if (thumbData) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('media-assets')
            .getPublicUrl(thumbPath)
          thumbnailUrl = thumbPublicUrl
        }
      }

      if (controller.signal.aborted) return

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 75, thumbnailUrl } : f
      ))

      // 5. Create database record (100%)
      const { data: { user } } = await supabase.auth.getUser()

      const { error: dbError } = await supabase
        .from('media_assets')
        .insert({
          user_id: user?.id,
          project_id: projectId || null,
          url: publicUrl,
          thumbnail_url: thumbnailUrl,
          filename: uploadFile.file.name,
          file_size: uploadFile.file.size,
          mime_type: uploadFile.file.type,
          width: metadata.width,
          height: metadata.height,
          captured_at: metadata.capturedAt || new Date().toISOString(),
          uploaded_at: new Date().toISOString(),
          description: description || null,
          tags,
          ai_tags: [],
          gps_latitude: metadata.gpsLatitude,
          gps_longitude: metadata.gpsLongitude,
          status: 'pending'
        })

      if (dbError) throw dbError

      // Success
      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'completed' as const, progress: 100 } : f
      ))

    } catch (error: any) {
      if (controller.signal.aborted) {
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'paused' as const } : f
        ))
      } else {
        console.error('Upload error:', error)
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? {
            ...f,
            status: 'failed' as const,
            error: error.message || 'Upload failed'
          } : f
        ))
      }
    } finally {
      abortControllersRef.current.delete(uploadFile.id)
    }
  }

  const startBatchUpload = async () => {
    if (files.length === 0) {
      alert('Please select at least one photo')
      return
    }

    setUploading(true)
    setPaused(false)

    // Get pending files
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'paused')

    // Process in batches
    const queue = [...pendingFiles]
    const running: Promise<void>[] = []

    while (queue.length > 0 || running.length > 0) {
      // Check if paused
      if (paused) {
        await Promise.all(running)
        break
      }

      // Start new uploads up to maxConcurrent
      while (running.length < maxConcurrent && queue.length > 0) {
        const file = queue.shift()!
        const uploadPromise = uploadSingleFile(file).finally(() => {
          const index = running.indexOf(uploadPromise)
          if (index > -1) running.splice(index, 1)
        })
        running.push(uploadPromise)
      }

      // Wait for at least one to finish
      if (running.length > 0) {
        await Promise.race(running)
      }
    }

    setUploading(false)

    // Check results
    const stats = getUploadStats()
    if (stats.failed === 0) {
      alert(`✅ Successfully uploaded ${stats.completed} photo(s)!`)
      onUploadComplete?.()
    } else {
      alert(`⚠️ Uploaded ${stats.completed} photo(s), ${stats.failed} failed. Review errors below.`)
    }
  }

  const pauseUpload = () => {
    setPaused(true)
    // Abort all in-progress uploads
    abortControllersRef.current.forEach(controller => controller.abort())
    abortControllersRef.current.clear()
  }

  const resumeUpload = () => {
    setPaused(false)
    startBatchUpload()
  }

  // ============================================================================
  // STATS
  // ============================================================================

  const getUploadStats = (): UploadStats => {
    return {
      total: files.length,
      completed: files.filter(f => f.status === 'completed').length,
      failed: files.filter(f => f.status === 'failed').length,
      pending: files.filter(f => f.status === 'pending').length,
      uploading: files.filter(f => f.status === 'uploading').length
    }
  }

  const stats = getUploadStats()
  const overallProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0

  // ============================================================================
  // HELPERS
  // ============================================================================

  async function extractMetadata(file: File) {
    return new Promise<any>((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          capturedAt: new Date().toISOString(),
          gpsLatitude: null,
          gpsLongitude: null
        })
      }
      img.onerror = () => resolve({})
      img.src = URL.createObjectURL(file)
    })
  }

  async function generateThumbnail(file: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)

        const maxSize = 300
        let width = img.width
        let height = img.height

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
      }
      img.onerror = () => resolve(null)
      img.src = URL.createObjectURL(file)
    })
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Batch Photo Upload</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload multiple photos simultaneously
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Drop photos here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports JPG, PNG, WebP • Max 50MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Select Photos
            </button>
          </div>

          {/* Batch Settings */}
          {files.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">Batch Settings</h3>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (applied to all)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for these photos..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (applied to all)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    placeholder="Add tags..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Concurrent uploads */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Concurrent Uploads: {maxConcurrent}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher = faster but more bandwidth usage
                </p>
              </div>
            </div>
          )}

          {/* Progress Stats */}
          {files.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="bg-blue-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-900">{stats.uploading}</div>
                <div className="text-xs text-blue-700">Uploading</div>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
                <div className="text-xs text-yellow-700">Pending</div>
              </div>
              <div className="bg-green-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
                <div className="text-xs text-green-700">Completed</div>
              </div>
              <div className="bg-red-100 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
                <div className="text-xs text-red-700">Failed</div>
              </div>
            </div>
          )}

          {/* Overall Progress Bar */}
          {files.length > 0 && uploading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm font-semibold text-gray-900">{overallProgress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">
                  Files ({files.length})
                </h3>
                <div className="flex gap-2">
                  {stats.completed > 0 && (
                    <button
                      onClick={clearCompleted}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear Completed
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    disabled={uploading}
                    className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-white border rounded-lg"
                  >
                    {/* Thumbnail */}
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-12 h-12 rounded object-cover"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {file.error && (
                        <p className="text-xs text-red-600 mt-1">{file.error}</p>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      {file.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">
                            {file.progress}%
                          </span>
                        </div>
                      )}
                      {file.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {file.status === 'failed' && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      {file.status === 'pending' && (
                        <div className="w-16 h-2 bg-gray-200 rounded-full" />
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading'}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Cancel'}
          </button>

          <div className="flex gap-2">
            {uploading && !paused && (
              <button
                onClick={pauseUpload}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
            )}

            {paused && (
              <button
                onClick={resumeUpload}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Resume
              </button>
            )}

            {!uploading && !paused && (
              <button
                onClick={startBatchUpload}
                disabled={files.length === 0 || stats.pending === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Upload {stats.pending} Photo{stats.pending !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
