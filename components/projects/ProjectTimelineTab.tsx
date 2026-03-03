'use client'

import { useState } from 'react'
import { ProjectDetails, ProjectMilestone } from '@/lib/projects/get-project-details'
import {
  PlusIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FlagIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'

interface Props {
  project: ProjectDetails
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

export default function ProjectTimelineTab({ project }: Props) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(project.milestones)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    due_date: '',
    status: 'pending' as ProjectMilestone['status']
  })

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
        setForm({ name: '', description: '', due_date: '', status: 'pending' })
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleComplete(milestone: ProjectMilestone) {
    const newStatus: ProjectMilestone['status'] = milestone.status === 'completed' ? 'in-progress' : 'completed'
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { data } = await supabase
      .from('project_milestones')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', milestone.id)
      .select()
      .single()

    if (data) {
      setMilestones(prev => prev.map(m => m.id === milestone.id ? data as ProjectMilestone : m))
    }
  }

  async function deleteMilestone(milestoneId: string) {
    if (!confirm('Delete this milestone?')) return
    const supabase = (await import('@/lib/supabase/client')).createClient()
    await supabase.from('project_milestones').delete().eq('id', milestoneId)
    setMilestones(prev => prev.filter(m => m.id !== milestoneId))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Timeline & Milestones</h2>
          <p className="text-sm text-gray-500 mt-1">Track key project milestones and deliverables</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
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
          {/* Elapsed bar */}
          <div
            className={`h-full rounded-full ${project.isOverdue ? 'bg-red-400' : 'bg-blue-400'}`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
          {/* Today marker */}
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
          {/* Milestone markers */}
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

      {/* Add Milestone Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">New Milestone</h3>
          <form onSubmit={handleAddMilestone} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Milestone Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Foundation Complete, Framing Inspection"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional details about this milestone"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as ProjectMilestone['status'] }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Milestone'}
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
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="divide-y">
            {sorted.map((milestone, idx) => {
              const overdue = isOverdue(milestone)
              return (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-4 p-4 hover:bg-gray-50 ${overdue ? 'bg-red-50/30' : ''}`}
                >
                  {/* Complete toggle */}
                  <button
                    onClick={() => toggleComplete(milestone)}
                    className="flex-shrink-0"
                    title={milestone.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {milestone.status === 'completed'
                      ? <CheckCircleSolid className="h-6 w-6 text-green-500" />
                      : <div className="h-6 w-6 rounded-full border-2 border-gray-300 hover:border-green-400" />
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
                  <div className="text-right flex-shrink-0">
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
                    onClick={() => deleteMilestone(milestone.id)}
                    className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 rounded"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
