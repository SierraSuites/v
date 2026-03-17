'use client'

/**
 * Documents List Page
 * Browse, search, and manage documents
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PlusIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'

interface Document {
  id: string
  name: string
  description?: string
  category: string
  subcategory?: string
  tags?: string[]
  file_name: string
  file_size: number
  file_type: string
  file_extension?: string
  version_number: number
  is_latest_version: boolean
  visibility: string
  project?: {
    id: string
    name: string
  }
  uploaded_by_user?: {
    first_name?: string
    last_name?: string
  }
  created_at: string
}

const DOCUMENT_CATEGORIES = [
  { value: 'contract', label: 'Contracts', icon: '📄' },
  { value: 'plan', label: 'Plans', icon: '📐' },
  { value: 'permit', label: 'Permits', icon: '📋' },
  { value: 'rfi', label: 'RFIs', icon: '❓' },
  { value: 'submittal', label: 'Submittals', icon: '📤' },
  { value: 'invoice', label: 'Invoices', icon: '💰' },
  { value: 'photo', label: 'Photos', icon: '📷' },
  { value: 'report', label: 'Reports', icon: '📊' },
  { value: 'correspondence', label: 'Correspondence', icon: '✉️' },
  { value: 'specification', label: 'Specifications', icon: '📝' },
  { value: 'drawing', label: 'Drawings', icon: '🎨' },
  { value: 'warranty', label: 'Warranties', icon: '🛡️' },
  { value: 'certificate', label: 'Certificates', icon: '🏆' },
  { value: 'other', label: 'Other', icon: '📁' },
]

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  useEffect(() => {
    loadDocuments()
  }, [selectedCategory])

  async function loadDocuments() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        latest_only: 'true',
      })
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      const response = await fetch(`/api/documents?${params}`)
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(document: Document) {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`)
      if (!response.ok) throw new Error('Failed to get download URL')
      const data = await response.json()

      // Open download URL in new tab
      window.open(data.download_url, '_blank')
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Failed to download document')
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        doc.name.toLowerCase().includes(term) ||
        doc.description?.toLowerCase().includes(term) ||
        doc.file_name.toLowerCase().includes(term) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(term))
      )
    }
    return true
  })

  const categoryCounts = DOCUMENT_CATEGORIES.map(cat => ({
    ...cat,
    count: documents.filter(d => d.category === cat.value).length,
  }))

  const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0)

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage project documents, contracts, and files
          </p>
        </div>
        <Link
          href="/documents/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Upload Document
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FolderIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {categoryCounts.filter(c => c.count > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DocumentIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📚</span>
                  <span>All Documents</span>
                </span>
                <span className="text-xs text-gray-500">{documents.length}</span>
              </button>
              {categoryCounts.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </span>
                  {cat.count > 0 && (
                    <span className="text-xs text-gray-500">{cat.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="lg:col-span-3">
          {/* Search and Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Documents Table */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No documents found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by uploading your first document'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <DocumentIcon className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{document.name}</div>
                            <div className="text-xs text-gray-500">{document.file_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {DOCUMENT_CATEGORIES.find(c => c.value === document.category)?.label || document.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatFileSize(document.file_size)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(document.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/documents/${document.id}`)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="View"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDownload(document)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
