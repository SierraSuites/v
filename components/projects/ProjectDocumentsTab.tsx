'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserCompany } from '@/lib/auth/get-user-company'
import { ProjectDetails } from '@/lib/projects/get-project-details'

interface Document {
  id: string
  name: string
  file_url: string
  file_type: string
  file_size: number
  category: string
  uploaded_at: string
  uploaded_by: {
    id: string
    name: string
    avatar: string
  }
}

interface ProjectDocumentsTabProps {
  project: ProjectDetails
}

export default function ProjectDocumentsTab({ project }: ProjectDocumentsTabProps) {
  const projectId = project.id
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  async function loadDocuments() {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('project_documents')
        .select(`
          id,
          name,
          file_url,
          file_type,
          file_size,
          category,
          uploaded_at,
          uploaded_by:user_profiles!project_documents_uploaded_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      const formattedDocs: Document[] = (data || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        file_url: doc.file_url,
        file_type: doc.file_type,
        file_size: doc.file_size,
        category: doc.category,
        uploaded_at: doc.uploaded_at,
        uploaded_by: {
          id: (doc.uploaded_by as any)?.id || '',
          name: (doc.uploaded_by as any)?.full_name || 'Unknown',
          avatar: getInitials((doc.uploaded_by as any)?.full_name || 'Unknown')
        }
      }))

      setDocuments(formattedDocs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(files: FileList) {
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const supabase = createClient()
      const profile = await getUserCompany()

      if (!profile) {
        throw new Error('Not authenticated')
      }

      for (const file of Array.from(files)) {
        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024
        if (file.size > maxSize) {
          alert(`File ${file.name} is too large. Maximum size is 50MB.`)
          continue
        }

        // Upload to Supabase Storage
        const timestamp = Date.now()
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `${projectId}/${timestamp}-${sanitizedFileName}`

        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('project-documents')
          .getPublicUrl(filePath)

        // Create database record
        const { error: dbError } = await supabase
          .from('project_documents')
          .insert({
            project_id: projectId,
            name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            category: detectCategory(file.name),
            uploaded_by: profile.id
          })

        if (dbError) {
          console.error('Database error:', dbError)
          alert(`Failed to save ${file.name} record: ${dbError.message}`)
        }
      }

      // Reload documents
      await loadDocuments()
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(documentId: string, fileName: string) {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const supabase = createClient()

      // Delete from database (storage deletion can be handled by trigger or separately)
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error

      // Remove from local state
      setDocuments(prev => prev.filter(d => d.id !== documentId))
    } catch (error) {
      console.error('Failed to delete document:', error)
      alert('Failed to delete document. Please try again.')
    }
  }

  async function handleDownload(fileUrl: string, fileName: string) {
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download file. Please try again.')
    }
  }

  function detectCategory(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['pdf', 'doc', 'docx'].includes(ext ?? '')) return 'contract'
    if (['dwg', 'dxf', 'rvt', 'skp'].includes(ext ?? '')) return 'blueprint'
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext ?? '')) return 'photo'
    if (['xls', 'xlsx', 'csv'].includes(ext ?? '')) return 'invoice'
    if (['txt', 'md'].includes(ext ?? '')) return 'note'
    return 'other'
  }

  function getInitials(name: string): string {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  function getFileIcon(fileType: string, category: string): string {
    if (category === 'blueprint') return '📐'
    if (category === 'contract') return '📄'
    if (category === 'invoice') return '💰'
    if (category === 'photo') return '🖼️'
    if (category === 'note') return '📝'
    if (fileType.includes('pdf')) return '📕'
    if (fileType.includes('word') || fileType.includes('document')) return '📘'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📗'
    if (fileType.includes('image')) return '🖼️'
    return '📎'
  }

  const categories = [
    { value: 'all', label: 'All Documents', count: documents.length },
    { value: 'blueprint', label: 'Blueprints', count: documents.filter(d => d.category === 'blueprint').length },
    { value: 'contract', label: 'Contracts', count: documents.filter(d => d.category === 'contract').length },
    { value: 'invoice', label: 'Invoices', count: documents.filter(d => d.category === 'invoice').length },
    { value: 'photo', label: 'Photos', count: documents.filter(d => d.category === 'photo').length },
    { value: 'other', label: 'Other', count: documents.filter(d => d.category === 'other').length },
  ]

  const filteredDocuments = filter === 'all'
    ? documents
    : documents.filter(d => d.category === filter)

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
      handleUpload(e.dataTransfer.files)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : uploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">
          {uploading ? 'Uploading files...' : 'Upload Documents'}
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Supported: PDF, Word, Excel, Images, CAD files (Max 50MB per file)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            'Choose Files'
          )}
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === cat.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label} <span className={filter === cat.value ? 'opacity-90' : 'opacity-60'}>({cat.count})</span>
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              {/* File Icon */}
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                {getFileIcon(doc.file_type, doc.category)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{formatDate(doc.uploaded_at)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {doc.uploaded_by.avatar}
                    </div>
                    <span className="hidden md:inline">{doc.uploaded_by.name}</span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => window.open(doc.file_url, '_blank')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Preview"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDownload(doc.file_url, doc.name)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Download"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(doc.id, doc.name)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {filter === 'all' ? '' : filter} documents yet
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'Upload your first document to get started'
                : `Upload ${filter} files to see them here`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
