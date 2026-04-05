'use client'

import { useState, useEffect } from 'react'
import { ProjectDetails, ProjectMilestone } from '@/lib/projects/get-project-details'
import {
  PlusIcon,
  FlagIcon,
  TrashIcon,
  XMarkIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface Props {
  project: ProjectDetails
  onMilestoneCountChange?: (count: number) => void
}

const STATUS_COLORS: Record<ProjectMilestone['status'], string> = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200'
}

const STATUS_DOT: Record<ProjectMilestone['status'], string> = {
  pending: 'bg-gray-300',
  'in-progress': 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-400'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(milestone: ProjectMilestone) {
  return milestone.status !== 'completed' && milestone.status !== 'cancelled'
    && new Date(milestone.due_date) < new Date()
}

export default function ProjectTimelineTab({ project, onMilestoneCountChange }: Props) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(project.milestones)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchMilestones() {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', project.id)
        .order('due_date', { ascending: true })
      if (data) {
        setMilestones(data as ProjectMilestone[])
        onMilestoneCountChange?.(data.length)
      }
    }
    fetchMilestones()
  }, [project.id])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    due_date: '',
    status: 'pending' as ProjectMilestone['status']
  })
  const { darkMode, colors } = useThemeColors()

  // Detail sidebar state
  const [detailMilestone, setDetailMilestone] = useState<ProjectMilestone | null>(null)
  const [editingDetail, setEditingDetail] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', due_date: '', status: 'pending' as ProjectMilestone['status'] })
  const [confirmDeleteDetailId, setConfirmDeleteDetailId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sort milestones by due_date
  const sorted = [...milestones].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  // Stats
  const completedCount = milestones.filter(m => m.status === 'completed').length
  const overdueCount = milestones.filter(isOverdue).length
  const upcomingCount = milestones.filter(m => m.status === 'pending' || m.status === 'in-progress').length

  // Project timeline span
  const start = new Date(project.start_date)
  const end = new Date(project.end_date)
  const totalDays = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 1)
  const today = new Date()
  const elapsed = Math.min(Math.max((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 0), totalDays)
  const progressPercent = (elapsed / totalDays) * 100

  function openDetail(milestone: ProjectMilestone) {
    setDetailMilestone(milestone)
    setEditingDetail(false)
    setConfirmDeleteDetailId(null)
  }

  function startEdit() {
    if (!detailMilestone) return
    setEditForm({
      name: detailMilestone.name,
      description: detailMilestone.description ?? '',
      due_date: detailMilestone.due_date.slice(0, 10),
      status: detailMilestone.status,
    })
    setEditingDetail(true)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!detailMilestone || !editForm.name || !editForm.due_date) return
    setSaving(true)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data, error } = await supabase
        .from('project_milestones')
        .update({
          name: editForm.name,
          description: editForm.description || null,
          due_date: editForm.due_date,
          status: editForm.status,
        })
        .eq('id', detailMilestone.id)
        .select()
        .single()

      if (!error && data) {
        const updated = data as ProjectMilestone
        setMilestones(prev => prev.map(m => m.id === updated.id ? updated : m))
        setDetailMilestone(updated)
        setEditingDetail(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDetailDelete() {
    if (!confirmDeleteDetailId) return
    const supabase = (await import('@/lib/supabase/client')).createClient()
    await supabase.from('project_milestones').delete().eq('id', confirmDeleteDetailId)
    setMilestones(prev => prev.filter(m => m.id !== confirmDeleteDetailId))
    setSelectedIds(prev => { const next = new Set(prev); next.delete(confirmDeleteDetailId); return next })
    setDetailMilestone(null)
    setConfirmDeleteDetailId(null)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkMarkComplete() {
    const ids = Array.from(selectedIds).filter(id => milestones.find(m => m.id === id)?.status !== 'completed')
    if (!ids.length) return
    const supabase = (await import('@/lib/supabase/client')).createClient()
    await supabase.from('project_milestones').update({ status: 'completed', completed_at: new Date().toISOString() }).in('id', ids)
    setMilestones(prev => prev.map(m => ids.includes(m.id) ? { ...m, status: 'completed' as ProjectMilestone['status'], completed_at: new Date().toISOString() } : m))
    setSelectedIds(new Set())
  }

  async function bulkMarkActive() {
    const ids = Array.from(selectedIds).filter(id => milestones.find(m => m.id === id)?.status === 'completed')
    if (!ids.length) return
    const supabase = (await import('@/lib/supabase/client')).createClient()
    await supabase.from('project_milestones').update({ status: 'in-progress', completed_at: null }).in('id', ids)
    setMilestones(prev => prev.map(m => ids.includes(m.id) ? { ...m, status: 'in-progress' as ProjectMilestone['status'], completed_at: null } : m))
    setSelectedIds(new Set())
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.due_date) return
    setSubmitting(true)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data, error } = await supabase
        .from('project_milestones')
        .insert({
          project_id: project.id,
          name: form.name,
          description: form.description || null,
          due_date: form.due_date,
          status: form.status
        })
        .select()
        .single()

      if (!error && data) {
        setMilestones(prev => [...prev, data as ProjectMilestone])
        onMilestoneCountChange?.(milestones.length + 1)
        setForm({ name: '', description: '', due_date: '', status: 'pending' })
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteMilestone(milestoneId: string) {
    if (!confirm('Delete this milestone?')) return
    const supabase = (await import('@/lib/supabase/client')).createClient()
    await supabase.from('project_milestones').delete().eq('id', milestoneId)
    setMilestones(prev => {
      const next = prev.filter(m => m.id !== milestoneId)
      onMilestoneCountChange?.(next.length)
      return next
    })
    setSelectedIds(prev => { const next = new Set(prev); next.delete(milestoneId); return next })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Timeline & Milestones</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track key project milestones and deliverables</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center cursor-pointer gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Add Milestone
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <div className="text-xs text-gray-400 mt-1">of {milestones.length} total</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Upcoming</div>
          <div className="text-2xl font-bold text-blue-600">{upcomingCount}</div>
          <div className="text-xs text-gray-400 mt-1">pending / in progress</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Overdue</div>
          <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueCount}</div>
          <div className="text-xs text-gray-400 mt-1">past due date</div>
        </div>
      </div>

      {/* Project Timeline Bar */}
      <div className="bg-white border rounded-lg p-5">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{formatDate(project.start_date)}</span>
          <span className="font-medium text-gray-900">
            {project.daysRemaining > 0
              ? `${project.daysRemaining} days remaining`
              : `${Math.abs(project.daysRemaining)} days overdue`}
          </span>
          <span>{formatDate(project.end_date)}</span>
        </div>
        <div className="relative h-3 bg-gray-100 rounded-full overflow-visible">
          <div
            className={`h-full rounded-full ${project.isOverdue ? 'bg-red-400' : 'bg-blue-400'}`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
          {progressPercent <= 100 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gray-800 rounded"
              style={{ left: `${progressPercent}%` }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap font-medium">
                Today
              </span>
            </div>
          )}
          {sorted.map(m => {
            const mDate = new Date(m.due_date)
            const pos = Math.max(0, Math.min(100, ((mDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100))
            return (
              <div
                key={m.id}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${pos}%` }}
                title={`${m.name} — ${formatDate(m.due_date)}`}
              >
                <div className={`w-3 h-3 rounded-full border-2 border-white ${STATUS_DOT[m.status]} -translate-x-1/2`} />
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Colored dots = milestones &nbsp;|&nbsp; Gray=pending, Blue=in-progress, Green=completed
        </p>
      </div>

      {/* Add Milestone Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl w-full max-w-lg flex flex-col"
            style={{ backgroundColor: colors.bg, boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: colors.borderBottom }}
            >
              <div>
                <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Add Milestone</h2>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Add a key milestone to track project progress</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <svg className="w-6 h-6" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAddMilestone}>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {/* Milestone Name */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Milestone Name <span className="text-[#FF6B6B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Foundation Complete, Framing Inspection"
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional details about this milestone"
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Due Date <span className="text-[#FF6B6B]">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as ProjectMilestone['status'] }))}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text, colorScheme: darkMode ? 'dark' : 'light' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-4 flex items-center justify-end gap-3"
                style={{ borderTop: colors.borderBottom }}
              >
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm({ name: '', description: '', due_date: '', status: 'pending' }) }}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                  style={{ border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-[#FF6B6B] text-white font-medium hover:bg-[#FF5252] transition-colors disabled:opacity-50"
                  style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)" }}
                >
                  {submitting ? 'Adding...' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestones List */}
      {sorted.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <FlagIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No milestones yet</h3>
          <p className="text-sm text-gray-500 mb-4">Add key milestones to track project progress</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add First Milestone
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((milestone) => {
            const overdue = isOverdue(milestone)
            const isSelected = selectedIds.has(milestone.id)
            return (
              <div
                key={milestone.id}
                onClick={() => !selectedIds.size && openDetail(milestone)}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] dark:hover:border-gray-500 transition-all cursor-pointer"
                style={isSelected ? { backgroundColor: darkMode ? 'rgba(59,130,246,0.1)' : 'rgba(219,234,254,0.4)', borderColor: '#93c5fd' } : {}}
              >
                {/* Checkbox */}
                <button
                  onClick={e => { e.stopPropagation(); toggleSelect(milestone.id) }}
                  className="shrink-0"
                >
                  {isSelected
                    ? <div className="h-6 w-6 rounded border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                        <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    : milestone.status === 'completed'
                      ? <div className="h-6 w-6 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center">
                          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      : <div className="h-6 w-6 rounded border-2 border-gray-300 hover:border-blue-500" />
                  }
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-gray-900 ${milestone.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                    {milestone.name}
                  </p>
                  {milestone.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{milestone.description}</p>
                  )}
                </div>

                {/* Due date */}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-700'}`}>
                    {formatDate(milestone.due_date)}
                  </p>
                  {milestone.completed_at && (
                    <p className="text-xs text-green-600">Done {formatDate(milestone.completed_at)}</p>
                  )}
                  {overdue && <p className="text-xs text-red-500">Overdue</p>}
                </div>

                {/* Status badge */}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[milestone.status]}`}>
                  {milestone.status.replace('-', ' ')}
                </span>

                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); deleteMilestone(milestone.id) }}
                  className="shrink-0 p-1 text-gray-300 hover:text-red-500 rounded"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Milestone Detail Sidebar */}
      {detailMilestone && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDetailMilestone(null)} />
          <div
            className="fixed right-0 top-0 h-full w-96 shadow-xl z-50 flex flex-col"
            style={{ backgroundColor: darkMode ? colors.bg : '#ffffff' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${darkMode ? colors.border : '#e5e7eb'}` }}
            >
              <h3 className="text-base font-semibold" style={{ color: darkMode ? colors.text : '#111827' }}>
                Milestone Details
              </h3>
              <button
                onClick={() => setDetailMilestone(null)}
                style={{ color: darkMode ? '#9ca3af' : '#9ca3af' }}
                className="hover:opacity-70"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {editingDetail ? (
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: darkMode ? colors.bgAlt : '#ffffff',
                        borderColor: darkMode ? colors.border : '#d1d5db',
                        color: darkMode ? colors.text : '#111827',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Description
                    </label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: darkMode ? colors.bgAlt : '#ffffff',
                        borderColor: darkMode ? colors.border : '#d1d5db',
                        color: darkMode ? colors.text : '#111827',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={editForm.due_date}
                      onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))}
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: darkMode ? colors.bgAlt : '#ffffff',
                        borderColor: darkMode ? colors.border : '#d1d5db',
                        color: darkMode ? colors.text : '#111827',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm(p => ({ ...p, status: e.target.value as ProjectMilestone['status'] }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: darkMode ? colors.bgAlt : '#ffffff',
                        borderColor: darkMode ? colors.border : '#d1d5db',
                        color: darkMode ? colors.text : '#111827',
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </form>
              ) : (
                <>
                  {/* Name & Description */}
                  <div>
                    <p className={`text-lg font-semibold ${detailMilestone.status === 'completed' ? 'line-through' : ''}`}
                      style={{ color: detailMilestone.status === 'completed' ? '#9ca3af' : (darkMode ? colors.text : '#111827') }}>
                      {detailMilestone.name}
                    </p>
                    {detailMilestone.description && (
                      <p className="text-sm mt-1" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                        {detailMilestone.description}
                      </p>
                    )}
                  </div>

                  {/* Overview */}
                  <section>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5"
                      style={{ color: darkMode ? '#6b7280' : '#9ca3af', borderBottom: `1px solid ${darkMode ? colors.border : '#f3f4f6'}` }}>
                      Overview
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}>Status</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[detailMilestone.status]}`}>
                          {detailMilestone.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}>Due Date</p>
                        <span className={`font-medium text-sm ${isOverdue(detailMilestone) ? 'text-red-500' : ''}`}
                          style={!isOverdue(detailMilestone) ? { color: darkMode ? colors.text : '#374151' } : {}}>
                          {formatDate(detailMilestone.due_date)}
                        </span>
                      </div>
                      {isOverdue(detailMilestone) && (
                        <div className="col-span-2">
                          <span className="text-xs font-medium text-red-500">Overdue</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Completion */}
                  {detailMilestone.completed_at && (
                    <section>
                      <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5"
                        style={{ color: darkMode ? '#6b7280' : '#9ca3af', borderBottom: `1px solid ${darkMode ? colors.border : '#f3f4f6'}` }}>
                        Completion
                      </p>
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}>Completed On</p>
                        <span className="font-medium text-sm text-green-600">{formatDate(detailMilestone.completed_at)}</span>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 flex gap-2"
              style={{ borderTop: `1px solid ${darkMode ? colors.border : '#e5e7eb'}` }}
            >
              {confirmDeleteDetailId ? (
                <>
                  <span className="flex-1 text-sm" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                    Delete this milestone?
                  </span>
                  <button
                    onClick={handleDetailDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDeleteDetailId(null)}
                    className="px-4 py-2 border rounded-lg text-sm font-medium"
                    style={{ borderColor: darkMode ? colors.border : '#e5e7eb', color: darkMode ? colors.text : '#374151' }}
                  >
                    Cancel
                  </button>
                </>
              ) : editingDetail ? (
                <>
                  <button
                    onClick={handleEditSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingDetail(false)}
                    className="px-4 py-2 border rounded-lg text-sm font-medium"
                    style={{ borderColor: darkMode ? colors.border : '#e5e7eb', color: darkMode ? colors.text : '#374151' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm font-medium cursor-pointer"
                    style={{ borderColor: darkMode ? colors.border : '#e5e7eb', color: darkMode ? colors.text : '#374151' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = darkMode ? colors.bgAlt : '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteDetailId(detailMilestone.id)}
                    className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium cursor-pointer hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating selection bar */}
      {selectedIds.size > 0 && (() => {
        const selMilestones = milestones.filter(m => selectedIds.has(m.id))
        const hasIncomplete = selMilestones.some(m => m.status !== 'completed')
        const hasComplete = selMilestones.some(m => m.status === 'completed')
        return (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm"
            style={{
              backgroundColor: darkMode ? '#1f2937' : '#ffffff',
              border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
              boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }} className="text-xs font-medium">
              {selectedIds.size} selected
            </span>
            <div style={{ backgroundColor: darkMode ? '#374151' : '#e5e7eb' }} className="w-px h-4" />
            {hasIncomplete && (
              <button
                onClick={bulkMarkComplete}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-500"
              >
                Mark Complete
              </button>
            )}
            {hasComplete && (
              <button
                onClick={bulkMarkActive}
                className="px-3 py-1.5 text-xs font-medium rounded-lg"
                style={{ backgroundColor: darkMode ? '#374151' : '#f3f4f6', color: darkMode ? '#d1d5db' : '#374151' }}
              >
                Mark Active
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs font-medium rounded-lg"
              style={{ color: darkMode ? '#6b7280' : '#9ca3af' }}
              onMouseEnter={e => (e.currentTarget.style.color = darkMode ? '#d1d5db' : '#374151')}
              onMouseLeave={e => (e.currentTarget.style.color = darkMode ? '#6b7280' : '#9ca3af')}
            >
              Clear
            </button>
          </div>
        )
      })()}
    </div>
  )
}
