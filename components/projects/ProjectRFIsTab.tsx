'use client'

import { useState, useEffect } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import {
  PlusIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface RFI {
  id: string
  rfi_number: string
  subject: string
  question: string
  response: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'draft' | 'open' | 'answered' | 'closed' | 'cancelled'
  due_date: string | null
  responded_at: string | null
  drawing_references: string[]
  spec_references: string[]
  created_at: string
  updated_at: string
}

interface Props {
  project: ProjectDetails
}

const PRIORITY_COLORS: Record<RFI['priority'], string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
}

const STATUS_COLORS: Record<RFI['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-yellow-100 text-yellow-700',
  answered: 'bg-green-100 text-green-700',
  closed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-400'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(dueDate: string | null, status: RFI['status']) {
  if (!dueDate || status === 'answered' || status === 'closed' || status === 'cancelled') return false
  return new Date(dueDate) < new Date()
}

export default function ProjectRFIsTab({ project }: Props) {
  const { colors, darkMode } = useThemeColors()
  const [rfis, setRFIs] = useState<RFI[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [coFromRfi, setCoFromRfi] = useState<RFI | null>(null)
  const [coForm, setCoForm] = useState({ title: '', change_amount: '', days_added: '0' })
  const [creatingCo, setCreatingCo] = useState(false)

  const [form, setForm] = useState({
    subject: '',
    question: '',
    priority: 'medium' as RFI['priority'],
    due_date: '',
    drawing_references: '',
    spec_references: ''
  })

  useEffect(() => {
    fetchRFIs()
  }, [project.id])

  async function fetchRFIs() {
    try {
      const res = await fetch(`/api/projects/${project.id}/rfis`)
      if (res.ok) {
        const data = await res.json()
        setRFIs(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject || !form.question) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/rfis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject,
          question: form.question,
          priority: form.priority,
          due_date: form.due_date || null,
          drawing_references: form.drawing_references
            ? form.drawing_references.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          spec_references: form.spec_references
            ? form.spec_references.split(',').map(s => s.trim()).filter(Boolean)
            : []
        })
      })
      if (res.ok) {
        const newRFI = await res.json()
        setRFIs(prev => [newRFI, ...(prev ?? [])])
        setForm({ subject: '', question: '', priority: 'medium', due_date: '', drawing_references: '', spec_references: '' })
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function submitResponse(rfiId: string) {
    if (!responseText.trim()) return
    const res = await fetch(`/api/projects/${project.id}/rfis/${rfiId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: responseText })
    })
    if (res.ok) {
      const updated = await res.json()
      setRFIs(prev => (prev ?? []).map(r => r.id === rfiId ? updated : r))
      setRespondingId(null)
      setResponseText('')
    }
  }

  async function closeRFI(rfiId: string) {
    const res = await fetch(`/api/projects/${project.id}/rfis/${rfiId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' })
    })
    if (res.ok) {
      const updated = await res.json()
      setRFIs(prev => (prev ?? []).map(r => r.id === rfiId ? updated : r))
      // Auto-unblock tasks blocked by this RFI
      const supabase = (await import('@/lib/supabase/client')).createClient()
      await supabase
        .from('tasks')
        .update({ status: 'not-started', blocking_rfi_id: null })
        .eq('blocking_rfi_id', rfiId)
        .eq('status', 'blocked')
    }
  }

  async function deleteRFI(rfiId: string) {
    const res = await fetch(`/api/projects/${project.id}/rfis/${rfiId}`, { method: 'DELETE' })
    if (res.ok) setRFIs(prev => (prev ?? []).filter(r => r.id !== rfiId))
    setConfirmDeleteId(null)
  }

  function openCoForm(rfi: RFI) {
    setCoFromRfi(rfi)
    setCoForm({ title: `CO from RFI ${rfi.rfi_number}: ${rfi.subject}`, change_amount: '', days_added: '0' })
  }

  async function submitCoFromRfi(e: React.FormEvent) {
    e.preventDefault()
    if (!coFromRfi || !coForm.title || !coForm.change_amount) return
    setCreatingCo(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/change-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: coForm.title,
          description: coFromRfi.response
            ? `From RFI ${coFromRfi.rfi_number}: ${coFromRfi.response}`
            : `From RFI ${coFromRfi.rfi_number}: ${coFromRfi.subject}`,
          reason: 'rfi',
          change_amount: parseFloat(coForm.change_amount),
          days_added: parseInt(coForm.days_added) || 0,
        }),
      })
      if (res.ok) {
        setCoFromRfi(null)
      }
    } finally {
      setCreatingCo(false)
    }
  }

  if (rfis === null) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" /></div>

  const filtered = filterStatus === 'all' ? rfis : rfis.filter(r => r.status === filterStatus)
  const openCount = rfis.filter(r => r.status === 'open').length
  const overdueCount = rfis.filter(r => isOverdue(r.due_date, r.status)).length
  const answeredCount = rfis.filter(r => r.status === 'answered' || r.status === 'closed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">RFIs</h2>
          <p className="text-sm text-gray-500 mt-1">Requests for Information from architects and engineers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          New RFI
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Open */}
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: openCount > 0 ? 'rgba(217,119,6,0.1)' : (darkMode ? 'rgba(75,85,99,0.2)' : '#F3F4F6') }}>
              <QuestionMarkCircleIcon className="w-5 h-5" style={{ color: openCount > 0 ? '#D97706' : (darkMode ? '#6B7280' : '#9CA3AF') }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Open</div>
              <div className="text-lg font-bold" style={{ color: openCount > 0 ? '#D97706' : colors.textMuted }}>{openCount}</div>
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${rfis.length ? (openCount / rfis.length) * 100 : 0}%`, backgroundColor: '#D97706' }} />
          </div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>awaiting response</div>
        </div>

        {/* Overdue */}
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: overdueCount > 0 ? 'rgba(220,38,38,0.1)' : (darkMode ? 'rgba(75,85,99,0.2)' : '#F3F4F6') }}>
              <ExclamationTriangleIcon className="w-5 h-5" style={{ color: overdueCount > 0 ? '#DC2626' : (darkMode ? '#6B7280' : '#9CA3AF') }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Overdue</div>
              <div className="text-lg font-bold" style={{ color: overdueCount > 0 ? '#DC2626' : colors.textMuted }}>{overdueCount}</div>
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${rfis.length ? (overdueCount / rfis.length) * 100 : 0}%`, backgroundColor: overdueCount > 0 ? '#DC2626' : '#9CA3AF' }} />
          </div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>past due date</div>
        </div>

        {/* Resolved */}
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
              <CheckCircleIcon className="w-5 h-5" style={{ color: '#16A34A' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Resolved</div>
              <div className="text-lg font-bold" style={{ color: '#16A34A' }}>{answeredCount}</div>
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${rfis.length ? (answeredCount / rfis.length) * 100 : 0}%`, backgroundColor: '#16A34A' }} />
          </div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>answered + closed</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'open', 'answered', 'closed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              filterStatus === s
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">New RFI</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="e.g., Clarification on structural beam specifications"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
              <textarea
                value={form.question}
                onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                placeholder="Describe the information needed in detail..."
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value as RFI['priority'] }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Drawing References</label>
                <input
                  type="text"
                  value={form.drawing_references}
                  onChange={e => setForm(p => ({ ...p, drawing_references: e.target.value }))}
                  placeholder="A-101, S-201 (comma separated)"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spec References</label>
                <input
                  type="text"
                  value={form.spec_references}
                  onChange={e => setForm(p => ({ ...p, spec_references: e.target.value }))}
                  placeholder="03 30 00, 05 12 00 (comma separated)"
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
                {submitting ? 'Submitting...' : 'Submit RFI'}
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

      {/* RFI List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <QuestionMarkCircleIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-base font-medium text-gray-900 mb-1">
            {filterStatus === 'all' ? 'No RFIs yet' : `No ${filterStatus} RFIs`}
          </h3>
          <p className="text-sm text-gray-500 mb-4">Submit requests for information from architects and engineers</p>
          {filterStatus === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
              Submit First RFI
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rfi => {
            const overdue = isOverdue(rfi.due_date, rfi.status)
            return (
              <div key={rfi.id} className={`bg-white border rounded-lg overflow-hidden ${overdue ? 'border-red-200' : ''}`}>
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === rfi.id ? null : rfi.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-xs font-mono font-semibold text-gray-500 whitespace-nowrap">
                      {rfi.rfi_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{rfi.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{formatDate(rfi.created_at)}</span>
                        {overdue && (
                          <span className="text-xs text-red-600 font-medium flex items-center gap-0.5">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                        {rfi.due_date && !overdue && (
                          <span className="text-xs text-gray-400">Due {formatDate(rfi.due_date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[rfi.priority]}`}>
                      {rfi.priority}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[rfi.status]}`}>
                      {rfi.status}
                    </span>
                    {expandedId === rfi.id
                      ? <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                      : <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    }
                  </div>
                </div>

                {expandedId === rfi.id && (
                  <div className="border-t px-4 pb-4 pt-3 bg-gray-50 space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Question</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{rfi.question}</p>
                    </div>

                    {(rfi.drawing_references?.length > 0 || rfi.spec_references?.length > 0) && (
                      <div className="flex gap-6">
                        {rfi.drawing_references?.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Drawing References</p>
                            <div className="flex gap-1 flex-wrap">
                              {rfi.drawing_references.map(ref => (
                                <span key={ref} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{ref}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {rfi.spec_references?.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">Spec References</p>
                            <div className="flex gap-1 flex-wrap">
                              {rfi.spec_references.map(ref => (
                                <span key={ref} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{ref}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {rfi.response && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          <p className="text-xs text-green-700 font-medium">
                            Response {rfi.responded_at ? `• ${formatDate(rfi.responded_at)}` : ''}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{rfi.response}</p>
                      </div>
                    )}

                    {/* Response form */}
                    {rfi.status === 'open' && respondingId === rfi.id && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Your Response</label>
                        <textarea
                          value={responseText}
                          onChange={e => setResponseText(e.target.value)}
                          placeholder="Provide the requested information..."
                          rows={3}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => submitResponse(rfi.id)}
                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            Submit Response
                          </button>
                          <button
                            onClick={() => { setRespondingId(null); setResponseText('') }}
                            className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {rfi.status === 'open' && respondingId !== rfi.id && (
                        <button
                          onClick={() => setRespondingId(rfi.id)}
                          className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"
                        >
                          Add Response
                        </button>
                      )}
                      {(rfi.status === 'open' || rfi.status === 'answered') && (
                        <button
                          onClick={() => closeRFI(rfi.id)}
                          className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                        >
                          Close RFI
                        </button>
                      )}
                      {(rfi.status === 'answered' || rfi.status === 'closed') && (
                        <button
                          onClick={() => openCoForm(rfi)}
                          className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
                        >
                          + Create Change Order
                        </button>
                      )}
                      {rfi.status === 'open' && (
                        <button
                          onClick={() => setConfirmDeleteId(rfi.id)}
                          className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-medium ml-auto"
                        >
                          <TrashIcon className="h-3.5 w-3.5 inline mr-1" />
                          Delete
                        </button>
                      )}
                    </div>
                    {coFromRfi?.id === rfi.id && (
                      <form onSubmit={submitCoFromRfi} className="mt-3 p-3 rounded-lg space-y-3" style={{ backgroundColor: darkMode ? 'rgba(124,58,237,0.1)' : '#f5f3ff', border: '1px solid #ddd6fe' }}>
                        <p className="text-xs font-semibold" style={{ color: '#7C3AED' }}>New Change Order from this RFI</p>
                        <input
                          type="text"
                          value={coForm.title}
                          onChange={e => setCoForm(p => ({ ...p, title: e.target.value }))}
                          placeholder="Change order title"
                          required
                          className="w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                          style={{ backgroundColor: darkMode ? colors.bgAlt : '#fff', borderColor: '#ddd6fe', color: colors.text }}
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={coForm.change_amount}
                            onChange={e => setCoForm(p => ({ ...p, change_amount: e.target.value }))}
                            placeholder="Cost change ($)"
                            required
                            step="0.01"
                            className="flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                            style={{ backgroundColor: darkMode ? colors.bgAlt : '#fff', borderColor: '#ddd6fe', color: colors.text }}
                          />
                          <input
                            type="number"
                            value={coForm.days_added}
                            onChange={e => setCoForm(p => ({ ...p, days_added: e.target.value }))}
                            placeholder="Days added"
                            min="0"
                            className="w-24 border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                            style={{ backgroundColor: darkMode ? colors.bgAlt : '#fff', borderColor: '#ddd6fe', color: colors.text }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={creatingCo} className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium disabled:opacity-50">
                            {creatingCo ? 'Creating...' : 'Create CO'}
                          </button>
                          <button type="button" onClick={() => setCoFromRfi(null)} className="text-xs px-3 py-1.5 border rounded text-gray-600 hover:bg-gray-50 font-medium">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDeleteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <p className="text-sm font-medium text-center mb-1" style={{ color: colors.text }}>Delete this RFI?</p>
              <p className="text-xs text-center mb-5" style={{ color: colors.textMuted }}>
                {rfis.find(r => r.id === confirmDeleteId)?.subject}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteRFI(confirmDeleteId)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
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
