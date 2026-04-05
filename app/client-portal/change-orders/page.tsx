'use client'

import { useEffect, useState } from 'react'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'

interface ChangeOrder {
  id: string
  title: string
  description?: string
  status: string
  amount?: number
  created_at: string
  project_name?: string
}

export default function ClientPortalChangeOrdersPage() {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/client-portal/change-orders')
      .then(r => r.ok ? r.json() : { change_orders: [] })
      .then(d => setChangeOrders(d.change_orders || []))
      .finally(() => setLoading(false))
  }, [])

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Change Orders</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : changeOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No change orders yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {changeOrders.map(co => (
            <div key={co.id} className="p-5 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{co.title}</h3>
                  {co.project_name && (
                    <p className="text-sm text-gray-500">{co.project_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {co.amount != null && (
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(co.amount)}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[co.status] || 'bg-gray-100 text-gray-800'}`}>
                    {co.status}
                  </span>
                </div>
              </div>
              {co.description && (
                <p className="text-sm text-gray-600 mb-2">{co.description}</p>
              )}
              <p className="text-xs text-gray-400">{new Date(co.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
