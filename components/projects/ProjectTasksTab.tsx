'use client'

import { useState, useEffect, useRef } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { createClient } from '@/lib/supabase/client'
import {
  PlusIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'review'
  priority: 'low' | 'medium' | 'high' | 'critical'
  due_date: string | null
  assignee_id: string | null
  created_at: string
  updated_at: string
}

interface Props {
  project: ProjectDetails
}

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-50 text-orange-600',
  critical: 'bg-red-100 text-red-700'
}

const STATUS_LABELS: Record<Task['status'], string> = {
  'not-started': 'To Do',
  'in-progress': 'In Progress',
  'completed': 'Done',
  'blocked': 'Blocked',
  'review': 'In Review'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(task: Task) {
  return task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date()
}

export default function ProjectTasksTab({ project }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [confirmingTaskId, setConfirmingTaskId] = useState<string | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ task: Task; prevStatus: Task['status'] } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: ''
  })

  useEffect(() => {
    fetchTasks()
  }, [project.id])

  async function fetchTasks() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })

      if (!error) {
        const fetched = (data as Task[]) || []
        setTasks(fetched)
        await syncProgress(fetched)
      }
    } catch {
      // tasks table may use different schema
    } finally {
      setLoading(false)
    }
  }

  async function syncProgress(currentTasks: Task[]) {
    if (currentTasks.length === 0) return
    const completed = currentTasks.filter(t => t.status === 'completed').length
    const progress = Math.round((completed / currentTasks.length) * 100)
    const supabase = createClient()
    await supabase
      .from('projects')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', project.id)
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: project.id,
          title: form.title,
          description: form.description || null,
          priority: form.priority,
          due_date: form.due_date || null,
          status: 'not-started',
          created_by: user?.id
        })
        .select()
        .single()

      if (!error && data) {
        const updated = [data as Task, ...tasks]
        setTasks(updated)
        setForm({ title: '', description: '', priority: 'medium', due_date: '' })
        setShowForm(false)
        await syncProgress(updated)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleTaskDone(task: Task, showUndo = false) {
    const prevStatus = task.status
    const newStatus: Task['status'] = prevStatus === 'completed' ? 'not-started' : 'completed'
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .select()
      .single()

    if (data) {
      const updated = tasks.map(t => t.id === task.id ? data as Task : t)
      setTasks(updated)
      await syncProgress(updated)

      if (showUndo && newStatus === 'completed') {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
        setUndoInfo({ task: data as Task, prevStatus })
        undoTimerRef.current = setTimeout(() => setUndoInfo(null), 4000)
      }
    }
  }

  async function handleUndo() {
    if (!undoInfo) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoInfo(null)
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .update({ status: undoInfo.prevStatus, updated_at: new Date().toISOString() })
      .eq('id', undoInfo.task.id)
      .select()
      .single()
    if (data) {
      const updated = tasks.map(t => t.id === undoInfo.task.id ? data as Task : t)
      setTasks(updated)
      await syncProgress(updated)
    }
  }

  const filtered = tasks.filter(t => {
    if (filterStatus === 'active') return t.status !== 'completed'
    if (filterStatus === 'done') return t.status === 'completed'
    return true
  })

  const todoCount = tasks.filter(t => t.status === 'not-started').length
  const inProgressCount = tasks.filter(t => t.status === 'in-progress' || t.status === 'review').length
  const doneCount = tasks.filter(t => t.status === 'completed').length
  const overdueCount = tasks.filter(isOverdue).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Project Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">Tasks linked to this project</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/taskflow"
            className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Open TaskFlow
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-lg font-bold text-gray-600">{todoCount}</div>
          <div className="text-xs text-gray-500">To Do</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-lg font-bold text-blue-600">{inProgressCount}</div>
          <div className="text-xs text-gray-500">In Progress</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-lg font-bold text-green-600">{doneCount}</div>
          <div className="text-xs text-gray-500">Done</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className={`text-lg font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{overdueCount}</div>
          <div className="text-xs text-gray-500">Overdue</div>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Completion</span>
            <span className="font-medium text-gray-900">{Math.round((doneCount / tasks.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(doneCount / tasks.length) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">{doneCount} of {tasks.length} tasks completed</div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active' },
          { key: 'done', label: 'Completed' },
          { key: 'all', label: 'All' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filterStatus === f.key
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Add Task Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">New Task</h3>
          <form onSubmit={handleAddTask} className="space-y-3">
            <div>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Task title *"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value as Task['priority'] }))}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical</option>
              </select>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Due date"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Task'}
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

      {/* Task List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border rounded-lg p-4 animate-pulse flex gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <CheckIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-base font-medium text-gray-900 mb-1">
            {filterStatus === 'done' ? 'No completed tasks yet' : 'No active tasks'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {filterStatus !== 'done' ? 'Add tasks to track work on this project' : 'Complete some tasks to see them here'}
          </p>
          {filterStatus !== 'done' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add First Task
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="divide-y">
            {filtered.map(task => {
              const overdue = isOverdue(task)
              return (
                <div key={task.id} className={`flex items-start gap-3 p-4 hover:bg-gray-50 ${overdue ? 'bg-red-50/30' : ''}`}>
                  <button
                    onClick={() => {
                      if (task.status === 'completed') {
                        toggleTaskDone(task)
                      } else {
                        setConfirmingTaskId(confirmingTaskId === task.id ? null : task.id)
                      }
                    }}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {task.status === 'completed'
                      ? <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      : <div className={`h-5 w-5 rounded border-2 ${confirmingTaskId === task.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300 hover:border-blue-500'}`} />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'text-red-600' : 'text-gray-400'}`}>
                          <ClockIcon className="h-3 w-3" />
                          {overdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                    {confirmingTaskId === task.id && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => { toggleTaskDone(task, true); setConfirmingTaskId(null) }}
                          className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => setConfirmingTaskId(null)}
                          className="px-3 py-1 border text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Undo toast */}
      {undoInfo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm">
          <span>Task marked as complete</span>
          <button
            onClick={handleUndo}
            className="font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            Undo
          </button>
          <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full animate-[shrink_4s_linear_forwards]" />
          </div>
        </div>
      )}
    </div>
  )
}
