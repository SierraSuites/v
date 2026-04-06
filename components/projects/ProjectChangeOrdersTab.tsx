'use client'

import { useState, useEffect } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import {
  PlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

interface ChangeOrder {
  id: string
  co_number: string
  title: string
  description: string
  reason: string | null
  original_amount: number
  change_amount: number
  days_added: number
  original_end_date: string | null
  status: 'draft' | 'pending_client' | 'client_approved' | 'client_rejected' | 'executed' | 'cancelled'
  created_at: string
  updated_at: string
  created_by: string | null
}

interface Props {
  project: ProjectDetails
}

const STATUS_LABELS: Record<ChangeOrder['status'], string> = {
  draft: 'Draft',
  pending_client: 'Pending Client',
  client_approved: 'Client Approved',
  client_rejected: 'Client Rejected',
  executed: 'Executed',
  cancelled: 'Cancelled'
}

const STATUS_COLORS: Record<ChangeOrder['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_client: 'bg-yellow-100 text-yellow-700',
  client_approved: 'bg-green-100 text-green-700',
  client_rejected: 'bg-red-100 text-red-700',
  executed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500'
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProjectChangeOrdersTab({ project }: Props) {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>(project.changeOrders as ChangeOrder[])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    reason: '',
    change_amount: '',
    days_added: '0'
  })

  useEffect(() => {
    fetchChangeOrders()
  }, [project.id])

  async function fetchChangeOrders() {
    try {
      const res = await fetch(`/api/projects/${project.id}/change-orders`)
      if (res.ok) {
        const data = await res.json()
        setChangeOrders(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent fail - table may not exist
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.description || !form.change_amount) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          reason: form.reason || null,
          change_amount: parseFloat(form.change_amount),
          days_added: parseInt(form.days_added) || 0
        })
      })

      if (res.ok) {
        const newCO = await res.json()
        setChangeOrders(prev => [newCO, ...prev])
        setForm({ title: '', description: '', reason: '', change_amount: '', days_added: '0' })
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(coId: string, status: ChangeOrder['status']) {
    const res = await fetch(`/api/projects/${project.id}/change-orders/${coId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (res.ok) {
      const updated = await res.json()
      setChangeOrders(prev => prev.map(co => co.id === coId ? updated : co))
    }
  }

  async function deleteCO(coId: string) {
    if (!confirm('Delete this change order?')) return
    const res = await fetch(`/api/projects/${project.id}/change-orders/${coId}`, { method: 'DELETE' })
    if (res.ok) {
      setChangeOrders(prev => prev.filter(co => co.id !== coId))
    }
  }

  // Summary stats
  const totalValue = changeOrders
    .filter(co => co.status === 'executed')
    .reduce((sum, co) => sum + co.change_amount, 0)
  const pendingCount = changeOrders.filter(co => co.status === 'pending_client').length
  const executedCount = changeOrders.filter(co => co.status === 'executed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Change Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track scope changes and budget adjustments
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          New Change Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total CO Value</div>
          <div className={`text-2xl font-bold ${totalValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalValue, project.currency)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{executedCount} executed</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Pending Approval</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          <div className="text-xs text-gray-400 mt-1">awaiting client</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total COs</div>
          <div className="text-2xl font-bold text-gray-900">{changeOrders.length}</div>
          <div className="text-xs text-gray-400 mt-1">all time</div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">New Change Order</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Additional electrical panel upgrade"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detailed description of the scope change..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="e.g., Client request, site condition, design change"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Change ({project.currency}) *</label>
                <input
                  type="number"
                  value={form.change_amount}
                  onChange={e => setForm(p => ({ ...p, change_amount: e.target.value }))}
                  placeholder="5000 or -2000"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Use negative for deductions</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Impact (days)</label>
                <input
                  type="number"
                  value={form.days_added}
                  onChange={e => setForm(p => ({ ...p, days_added: e.target.value }))}
                  placeholder="0"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Change Order'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : changeOrders.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No change orders yet</h3>
          <p className="text-sm text-gray-500 mb-4">Track scope changes and budget adjustments</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Create First Change Order
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {changeOrders.map(co => (
            <div key={co.id} className="bg-white border rounded-lg overflow-hidden">
              {/* CO Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === co.id ? null : co.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-xs font-mono font-semibold text-gray-500 whitespace-nowrap">
                    {co.co_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{co.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(co.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-sm font-semibold ${co.change_amount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {co.change_amount >= 0 ? '+' : ''}{formatCurrency(co.change_amount, project.currency)}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[co.status]}`}>
                    {STATUS_LABELS[co.status]}
                  </span>
                  {expandedId === co.id
                    ? <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                    : <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  }
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === co.id && (
                <div className="border-t px-4 pb-4 pt-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                      <p className="text-sm text-gray-700">{co.description}</p>
                    </div>
                    {co.reason && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Reason</p>
                        <p className="text-sm text-gray-700">{co.reason}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded p-3 border">
                      <p className="text-xs text-gray-500 mb-1">Original Budget</p>
                      <p className="text-sm font-semibold">{formatCurrency(co.original_amount, project.currency)}</p>
                    </div>
                    <div className="bg-white rounded p-3 border">
                      <p className="text-xs text-gray-500 mb-1">Change Amount</p>
                      <p className={`text-sm font-semibold ${co.change_amount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {co.change_amount >= 0 ? '+' : ''}{formatCurrency(co.change_amount, project.currency)}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3 border">
                      <p className="text-xs text-gray-500 mb-1">New Budget</p>
                      <p className="text-sm font-semibold">{formatCurrency(co.original_amount + co.change_amount, project.currency)}</p>
                    </div>
                  </div>

                  {co.days_added !== 0 && (
                    <p className="text-sm text-gray-600 mb-3">
                      Schedule impact: <span className="font-medium">{co.days_added > 0 ? '+' : ''}{co.days_added} days</span>
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {co.status === 'draft' && (
                      <button
                        onClick={() => updateStatus(co.id, 'pending_client')}
                        className="text-xs px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium"
                      >
                        Submit to Client
                      </button>
                    )}
                    {co.status === 'pending_client' && (
                      <>
                        <button
                          onClick={() => updateStatus(co.id, 'client_approved')}
                          className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
                        >
                          <CheckCircleIcon className="h-3.5 w-3.5 inline mr-1" />
                          Client Approved
                        </button>
                        <button
                          onClick={() => updateStatus(co.id, 'client_rejected')}
                          className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                        >
                          <XCircleIcon className="h-3.5 w-3.5 inline mr-1" />
                          Client Rejected
                        </button>
                      </>
                    )}
                    {co.status === 'client_approved' && (
                      <button
                        onClick={() => updateStatus(co.id, 'executed')}
                        className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                      >
                        Mark Executed
                      </button>
                    )}
                    {(co.status === 'draft' || co.status === 'pending_client') && (
                      <button
                        onClick={() => updateStatus(co.id, 'cancelled')}
                        className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                    {co.status === 'draft' && (
                      <button
                        onClick={() => deleteCO(co.id)}
                        className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-medium ml-auto"
                      >
                        <TrashIcon className="h-3.5 w-3.5 inline mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
