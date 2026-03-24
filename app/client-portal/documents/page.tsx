'use client'

import { useEffect, useState } from 'react'
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface Document {
  id: string
  name: string
  file_url: string
  file_type?: string
  created_at: string
  project_name?: string
}

export default function ClientPortalDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/client-portal/documents')
      .then(r => r.ok ? r.json() : { documents: [] })
      .then(d => setDocuments(d.documents || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Documents</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No documents shared yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="w-8 h-8 text-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.project_name && `${doc.project_name} · `}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
