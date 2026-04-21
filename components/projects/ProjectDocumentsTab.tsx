'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserCompany } from '@/lib/auth/get-user-company'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import toast from 'react-hot-toast'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface Document {
  id: string
  name: string
  file_path: string
  file_type: string
  file_size: number
  category: string
  uploaded_at: string
  linked_entity_type: 'change_order' | 'rfi' | 'design_selection' | null
  linked_entity_id: string | null
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
  const { colors, darkMode } = useThemeColors()
  const projectId = project.id
  const [documents, setDocuments] = useState<Document[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [dragActive, setDragActive] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ id: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [linkingDocId, setLinkingDocId] = useState<string | null>(null)
  const [entityOptions, setEntityOptions] = useState<{ type: string; id: string; label: string }[]>([])

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  useEffect(() => {
    async function loadEntityOptions() {
      const supabase = createClient()
      const [cosRes, rfisRes] = await Promise.all([
        supabase.from('project_change_orders').select('id, co_number, title').eq('project_id', projectId).order('created_at'),
        supabase.from('project_rfis').select('id, rfi_number, subject').eq('project_id', projectId).order('created_at'),
      ])
      const opts: { type: string; id: string; label: string }[] = []
      for (const co of cosRes.data || []) opts.push({ type: 'change_order', id: co.id, label: `CO ${co.co_number}: ${co.title}` })
      for (const rfi of rfisRes.data || []) opts.push({ type: 'rfi', id: rfi.id, label: `RFI ${rfi.rfi_number}: ${rfi.subject}` })
      setEntityOptions(opts)
    }
    loadEntityOptions()
  }, [projectId])

  useEffect(() => {
    if (!previewDoc) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
      return
    }
    const url = getPublicUrl(previewDoc.file_path)
    fetch(url)
      .then(r => r.blob())
      .then(blob => setPreviewBlobUrl(URL.createObjectURL(blob)))
      .catch(() => setPreviewBlobUrl(url)) // fallback to direct URL
  }, [previewDoc])

  async function loadDocuments() {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('project_documents')
        .select(`
          id,
          name,
          file_path,
          file_type,
          file_size,
          category,
          uploaded_at,
          linked_entity_type,
          linked_entity_id,
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
        file_path: (doc as any).file_path,
        file_type: doc.file_type,
        file_size: doc.file_size,
        category: doc.category,
        uploaded_at: doc.uploaded_at,
        linked_entity_type: (doc as any).linked_entity_type || null,
        linked_entity_id: (doc as any).linked_entity_id || null,
        uploaded_by: {
          id: (doc.uploaded_by as any)?.id || '',
          name: (doc.uploaded_by as any)?.full_name || 'Unknown',
          avatar: getInitials((doc.uploaded_by as any)?.full_name || 'Unknown')
        }
      }))

      setDocuments(formattedDocs)
    } catch (error: any) {
      console.error('Failed to load documents:', error?.code, error?.message, error?.details, error?.hint)
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
          toast.error(`File ${file.name} is too large. Maximum size is 50MB.`)
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
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`)
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
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            category: detectCategory(file.name),
            uploaded_by: profile.id
          })

        if (dbError) {
          console.error('Database error:', dbError)
          toast.error(`Failed to save ${file.name} record: ${dbError.message}`)
        }
      }

      // Reload documents
      await loadDocuments()
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(documentId: string) {
    try {
      const supabase = createClient()

      // Delete from database (storage deletion can be handled by trigger or separately)
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error

      // Remove from local state
      setDocuments(prev => (prev ?? []).filter(d => d.id !== documentId))
      setConfirmDeleteDoc(null)
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.error('Failed to delete document. Please try again.')
    }
  }

  async function linkDocument(docId: string, entityType: string | null, entityId: string | null) {
    const supabase = createClient()
    await supabase
      .from('project_documents')
      .update({ linked_entity_type: entityType, linked_entity_id: entityId })
      .eq('id', docId)
    setDocuments(prev => prev
      ? prev.map(d => d.id === docId ? { ...d, linked_entity_type: entityType as Document['linked_entity_type'], linked_entity_id: entityId } : d)
      : prev
    )
    setLinkingDocId(null)
  }

  function getPublicUrl(filePath: string) {
    const supabase = createClient()
    return supabase.storage.from('project-documents').getPublicUrl(filePath).data.publicUrl
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
      toast.error('Failed to download file. Please try again.')
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

  if (documents === null) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" /></div>

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
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Documents</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload and manage project files and attachments</p>
      </div>

      {/* Stat Cards */}
      {(() => {
        const total = documents.length
        const categories = [...new Set(documents.map(d => d.category))].length
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
        const recentCount = documents.filter(d => new Date(d.uploaded_at).getTime() > thirtyDaysAgo).length
        const totalSizeMB = documents.reduce((sum, d) => sum + (d.file_size || 0), 0) / (1024 * 1024)
        const trackBg = darkMode ? '#374151' : '#E5E7EB'
        return (
          <div className="grid grid-cols-3 gap-4">
            {/* Total Documents */}
            <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2563EB' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Total Files</div>
                  <div className="text-lg font-bold" style={{ color: colors.text }}>{total}</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                <div className="h-full rounded-full" style={{ width: total > 0 ? '100%' : '0%', backgroundColor: '#2563EB' }} />
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>{totalSizeMB.toFixed(1)} MB total</div>
            </div>

            {/* Recent Uploads */}
            <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: recentCount > 0 ? 'rgba(22,163,74,0.1)' : (darkMode ? 'rgba(75,85,99,0.2)' : '#F3F4F6') }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: recentCount > 0 ? '#16A34A' : (darkMode ? '#6B7280' : '#9CA3AF') }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Recent Uploads</div>
                  <div className="text-lg font-bold" style={{ color: recentCount > 0 ? '#16A34A' : colors.textMuted }}>{recentCount}</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                <div className="h-full rounded-full" style={{ width: `${total ? (recentCount / total) * 100 : 0}%`, backgroundColor: '#16A34A' }} />
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>in the last 30 days</div>
            </div>

            {/* Categories */}
            <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#7C3AED' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>Categories</div>
                  <div className="text-lg font-bold" style={{ color: colors.text }}>{categories}</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(categories * 14, 100)}%`, backgroundColor: '#7C3AED' }} />
              </div>
              <div className="text-xs mt-1" style={{ color: colors.textMuted }}>file types in use</div>
            </div>
          </div>
        )
      })()}

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
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 text-2xl">
                {getFileIcon(doc.file_type, doc.category)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                  {doc.linked_entity_type && (() => {
                    const opt = entityOptions.find(o => o.id === doc.linked_entity_id)
                    const label = doc.linked_entity_type === 'change_order' ? 'CO' : doc.linked_entity_type === 'rfi' ? 'RFI' : 'DS'
                    const color = doc.linked_entity_type === 'change_order' ? { bg: 'rgba(37,99,235,0.1)', text: '#2563EB' }
                                : doc.linked_entity_type === 'rfi'          ? { bg: 'rgba(245,158,11,0.1)', text: '#D97706' }
                                : { bg: 'rgba(22,163,74,0.1)', text: '#16A34A' }
                    return (
                      <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: color.bg, color: color.text }} title={opt?.label}>
                        {label}
                      </span>
                    )
                  })()}
                </div>
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
                {linkingDocId === doc.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      className="text-xs border rounded px-2 py-1 focus:outline-none"
                      style={{ borderColor: '#d1d5db', backgroundColor: darkMode ? colors.bgAlt : '#fff', color: colors.text }}
                      defaultValue=""
                      onChange={e => {
                        if (e.target.value === '') linkDocument(doc.id, null, null)
                        else {
                          const opt = entityOptions.find(o => o.id === e.target.value)
                          if (opt) linkDocument(doc.id, opt.type, opt.id)
                        }
                      }}
                    >
                      <option value="">— None —</option>
                      {entityOptions.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    <button onClick={() => setLinkingDocId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setLinkingDocId(linkingDocId === doc.id ? null : doc.id)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: doc.linked_entity_type ? '#2563EB' : colors.textMuted }}
                  title={doc.linked_entity_type ? 'Change entity link' : 'Link to CO/RFI'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: colors.textMuted }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.bgMuted)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  title="Preview"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDownload(getPublicUrl(doc.file_path), doc.name)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: colors.textMuted }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.bgMuted)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => setConfirmDeleteDoc({ id: doc.id, name: doc.name })}
                  className="p-2 rounded-lg transition-colors text-red-500"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = darkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
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

      {/* Preview Modal */}
      {previewDoc && (() => {
        const url = getPublicUrl(previewDoc.file_path)
        const isPdf = previewDoc.file_type.includes('pdf')
        const isImage = previewDoc.file_type.startsWith('image/')
        const canPreview = isPdf || isImage

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={() => setPreviewDoc(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
              style={{ width: '90vw', maxWidth: '1100px', height: '90vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{getFileIcon(previewDoc.file_type, previewDoc.category)}</span>
                  <span className="font-medium text-gray-900 truncate">{previewDoc.name}</span>
                  <span className="text-sm text-gray-500 shrink-0">{formatFileSize(previewDoc.file_size)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in tab
                  </a>
                  <button
                    onClick={() => handleDownload(url, previewDoc.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Preview Body */}
              <div className="flex-1 overflow-hidden bg-gray-100">
                {isPdf && (
                  previewBlobUrl
                    ? <iframe src={previewBlobUrl} className="w-full h-full border-0" title={previewDoc.name} />
                    : <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                )}
                {isImage && (
                  <div className="w-full h-full flex items-center justify-center p-6">
                    <img
                      src={url}
                      alt={previewDoc.name}
                      className="max-w-full max-h-full object-contain rounded shadow"
                    />
                  </div>
                )}
                {!canPreview && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-500">
                    <div className="text-6xl">{getFileIcon(previewDoc.file_type, previewDoc.category)}</div>
                    <p className="text-lg font-medium text-gray-700">Preview not available for this file type</p>
                    <p className="text-sm">{previewDoc.file_type || 'Unknown type'}</p>
                    <button
                      onClick={() => handleDownload(url, previewDoc.name)}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download to view
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Confirm Delete Modal */}
      {confirmDeleteDoc && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDeleteDoc(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <p className="text-sm font-medium text-center mb-1" style={{ color: colors.text }}>Delete this document?</p>
              <p className="text-xs text-center mb-5" style={{ color: colors.textMuted }}>{confirmDeleteDoc.name}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(confirmDeleteDoc.id)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteDoc(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
