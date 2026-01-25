"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ToastNotification'

interface Attachment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  filename: string
  file_size: number
  mime_type: string
  url: string
  thumbnail_url?: string
  created_at: string
}

interface TaskAttachmentsPanelProps {
  taskId: string
  taskTitle: string
  onClose: () => void
}

export default function TaskAttachmentsPanel({ taskId, taskTitle, onClose }: TaskAttachmentsPanelProps) {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
    loadAttachments()
  }, [taskId])

  const loadUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadAttachments = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load attachments')
      console.error(error)
    } else {
      setAttachments(data || [])
    }

    setLoading(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !user) {
      return
    }

    for (const file of Array.from(files)) {
      await uploadFile(file)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    const supabase = createClient()

    try {
      // Upload to Supabase Storage
      const fileName = `${taskId}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName)

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email || 'User',
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          url: publicUrl
        })

      if (dbError) {
        throw dbError
      }

      toast.success(`${file.name} uploaded`)
      await loadAttachments()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(`Failed to upload ${file.name}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete ${attachment.filename}?`)) {
      return
    }

    const supabase = createClient()

    // Delete from storage
    const fileName = attachment.url.split('/').pop()
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([`${taskId}/${fileName}`])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachment.id)

    if (dbError) {
      toast.error('Failed to delete attachment')
      console.error(dbError)
    } else {
      toast.success('Attachment deleted')
      await loadAttachments()
    }
  }

  const handleDownload = (attachment: Attachment) => {
    window.open(attachment.url, '_blank')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
    return '📎'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1" style={{ color: '#1A1A1A' }}>
              Attachments
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {taskTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <span className="text-2xl" style={{ color: '#4A4A4A' }}>×</span>
          </button>
        </div>

        {/* Upload Area */}
        <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full p-6 border-2 border-dashed rounded-xl hover:border-solid transition-all disabled:opacity-50"
            style={{ borderColor: '#FF6B6B' }}
          >
            <div className="text-center">
              <span className="text-4xl block mb-2">📎</span>
              <p className="font-semibold mb-1" style={{ color: '#1A1A1A' }}>
                {uploading ? 'Uploading...' : 'Click to upload files'}
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Any file type, up to 50MB
              </p>
            </div>
          </button>
          {uploading && uploadProgress > 0 && (
            <div className="mt-4">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    backgroundColor: '#FF6B6B',
                    width: `${uploadProgress}%`
                  }}
                />
              </div>
              <p className="text-xs text-center mt-1" style={{ color: '#6B7280' }}>
                {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Attachments List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full mx-auto" style={{ borderTopColor: '#FF6B6B' }} />
              <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>Loading attachments...</p>
            </div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">📎</span>
              <p className="mt-4 font-semibold" style={{ color: '#1A1A1A' }}>No attachments yet</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>Upload files to share with your team</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="border rounded-xl p-4 hover:shadow-lg transition-shadow"
                  style={{ borderColor: '#E0E0E0' }}
                >
                  <div className="flex items-start gap-3">
                    {/* File Icon */}
                    <span className="text-3xl flex-shrink-0">
                      {getFileIcon(attachment.mime_type)}
                    </span>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-sm truncate mb-1"
                        style={{ color: '#1A1A1A' }}
                        title={attachment.filename}
                      >
                        {attachment.filename}
                      </p>
                      <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                        {formatFileSize(attachment.file_size)}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        Uploaded by {attachment.user_name}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleDownload(attachment)}
                          className="px-3 py-1 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: '#FF6B6B' }}
                        >
                          Download
                        </button>
                        {user && user.id === attachment.user_id && (
                          <button
                            onClick={() => handleDelete(attachment)}
                            className="px-3 py-1 rounded text-xs font-semibold"
                            style={{
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626'
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center" style={{ borderColor: '#E0E0E0' }}>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            {attachments.length} attachment{attachments.length !== 1 ? 's' : ''} •{' '}
            {formatFileSize(attachments.reduce((sum, a) => sum + a.file_size, 0))} total
          </p>
        </div>
      </div>
    </div>
  )
}
