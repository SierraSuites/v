'use client'

import { useState, useEffect, useRef } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { createClient } from '@/lib/supabase/client'
import { updateTask, createTask } from '@/lib/supabase/tasks'
import {
  ClockIcon,
  XMarkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/outline'
import TaskCreationModal from '@/components/dashboard/TaskCreationModal'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'review'
  priority: 'low' | 'medium' | 'high' | 'critical'
  trade: string | null
  phase: string | null
  start_date: string | null
  due_date: string | null
  duration: number | null
  estimated_hours: number | null
  actual_hours: number | null
  progress: number | null
  assignee_id: string | null
  assignee_name: string | null
  crew_size: number | null
  equipment: string[] | null
  materials: string[] | null
  certifications: string[] | null
  safety_protocols: string[] | null
  quality_standards: string[] | null
  location: string | null
  weather_dependent: boolean | null
  weather_buffer: number | null
  inspection_required: boolean | null
  inspection_type: string | null
  dependencies: string[] | null
  attachments: number | null
  comments: number | null
  client_visibility: boolean | null
  created_at: string
  updated_at: string
}

interface Props {
  project: ProjectDetails
}

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
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
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)
  const [undoInfo, setUndoInfo] = useState<{ task: Task; prevStatus: Task['status'] } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function calcProgress(currentTasks: Task[]) {
    if (currentTasks.length === 0) return 0
    const totalHours = currentTasks.reduce((sum, t) => sum + (t.estimated_hours ?? 1), 0)
    const completedHours = currentTasks
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.estimated_hours ?? 1), 0)
    return Math.round((completedHours / totalHours) * 100)
  }

  async function syncProgress(currentTasks: Task[]) {
    if (currentTasks.length === 0) return
    const progress = calcProgress(currentTasks)
    window.dispatchEvent(new CustomEvent('project-progress-update', { detail: { progress } }))
    const supabase = createClient()
    await supabase
      .from('projects')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', project.id)
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

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkMarkComplete() {
    const ids = Array.from(selectedIds).filter(id => tasks.find(t => t.id === id)?.status !== 'completed')
    if (!ids.length) return
    const updated = tasks.map(t => ids.includes(t.id) ? { ...t, status: 'completed' as Task['status'] } : t)
    setTasks(updated)
    setSelectedIds(new Set())
    const supabase = createClient()
    await supabase.from('tasks').update({ status: 'completed', updated_at: new Date().toISOString() }).in('id', ids)
    await syncProgress(updated)
  }

  async function bulkMarkActive() {
    const ids = Array.from(selectedIds).filter(id => tasks.find(t => t.id === id)?.status === 'completed')
    if (!ids.length) return
    const updated = tasks.map(t => ids.includes(t.id) ? { ...t, status: 'not-started' as Task['status'] } : t)
    setTasks(updated)
    setSelectedIds(new Set())
    const supabase = createClient()
    await supabase.from('tasks').update({ status: 'not-started', updated_at: new Date().toISOString() }).in('id', ids)
    await syncProgress(updated)
  }

  async function deleteTask(id: string) {
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    const updated = tasks.filter(t => t.id !== id)
    setTasks(updated)
    setConfirmDeleteId(null)
    setDetailTask(null)
    await syncProgress(updated)
  }

  async function updateTaskStatus(taskId: string, status: Task['status']) {
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single()
    if (data) {
      const updated = tasks.map(t => t.id === taskId ? data as Task : t)
      setTasks(updated)
      await syncProgress(updated)
    }
    setStatusDropdownId(null)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleAddTask(taskData: any) {
    const { error } = await createTask({
      title: taskData.title!,
      description: taskData.description || null,
      project_id: project.id,
      project_name: project.name,
      trade: taskData.trade || 'general',
      phase: taskData.phase || 'pre-construction',
      priority: taskData.priority || 'medium',
      status: taskData.status || 'not-started',
      assignee_id: taskData.assigneeId || null,
      assignee_name: taskData.assignee || null,
      assignee_avatar: taskData.assigneeAvatar || null,
      start_date: taskData.startDate || null,
      due_date: taskData.dueDate || new Date().toISOString().split('T')[0],
      duration: taskData.duration || 1,
      progress: taskData.progress || 0,
      estimated_hours: taskData.estimatedHours || 8,
      actual_hours: taskData.actualHours || 0,
      dependencies: taskData.dependencies || [],
      attachments: taskData.attachments || 0,
      comments: taskData.comments || 0,
      location: taskData.location || null,
      weather_dependent: taskData.weatherDependent || false,
      weather_buffer: taskData.weatherBuffer || 0,
      inspection_required: taskData.inspectionRequired || false,
      inspection_type: taskData.inspectionType || null,
      crew_size: taskData.crewSize || 1,
      equipment: taskData.equipment || [],
      materials: taskData.materials || [],
      certifications: taskData.certifications || [],
      safety_protocols: taskData.safetyProtocols || [],
      quality_standards: taskData.qualityStandards || [],
      documentation: taskData.documentation || [],
      notify_inspector: taskData.notifyInspector || false,
      client_visibility: taskData.clientVisibility || false,
    })
    if (!error) {
      setShowAddTaskModal(false)
      await fetchTasks()
    }
  }

  function toModalTask(t: Task) {
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      project: project.name ?? '',
      projectId: project.id,
      trade: (t.trade ?? 'general') as "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general",
      phase: (t.phase ?? 'pre-construction') as "pre-construction" | "foundation" | "framing" | "mep" | "finishing" | "closeout",
      priority: t.priority,
      status: t.status,
      assignee: t.assignee_name ?? '',
      assigneeId: t.assignee_id ?? '',
      assigneeAvatar: '',
      startDate: t.start_date ?? '',
      dueDate: t.due_date ?? '',
      duration: t.duration ?? 0,
      progress: t.progress ?? 0,
      estimatedHours: t.estimated_hours ?? 0,
      actualHours: t.actual_hours ?? 0,
      dependencies: t.dependencies ?? [],
      attachments: t.attachments ?? 0,
      comments: t.comments ?? 0,
      location: t.location ?? '',
      weatherDependent: t.weather_dependent ?? false,
      weatherBuffer: t.weather_buffer ?? 0,
      inspectionRequired: t.inspection_required ?? false,
      inspectionType: t.inspection_type ?? '',
      crewSize: t.crew_size ?? 1,
      equipment: t.equipment ?? [],
      materials: t.materials ?? [],
      certifications: t.certifications ?? [],
      safetyProtocols: t.safety_protocols ?? [],
      qualityStandards: t.quality_standards ?? [],
      documentation: [],
      notifyInspector: false,
      clientVisibility: t.client_visibility ?? false,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleEditSave(taskData: any) {
    if (!detailTask) return
    const { error } = await updateTask(detailTask.id, {
      title: taskData.title!,
      description: taskData.description || null,
      trade: taskData.trade as "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general",
      phase: (taskData.phase || undefined) as "pre-construction" | "foundation" | "framing" | "mep" | "finishing" | "closeout" | undefined,
      priority: taskData.priority as Task['priority'],
      status: taskData.status as Task['status'],
      assignee_id: taskData.assigneeId || null,
      assignee_name: taskData.assignee || null,
      start_date: taskData.startDate || null,
      due_date: taskData.dueDate || null,
      duration: taskData.duration ?? 0,
      progress: taskData.progress ?? 0,
      estimated_hours: taskData.estimatedHours ?? 0,
      actual_hours: taskData.actualHours ?? 0,
      dependencies: taskData.dependencies ?? [],
      location: taskData.location || null,
      weather_dependent: taskData.weatherDependent ?? false,
      weather_buffer: taskData.weatherBuffer ?? 0,
      inspection_required: taskData.inspectionRequired ?? false,
      inspection_type: taskData.inspectionType || null,
      crew_size: taskData.crewSize ?? 1,
      equipment: taskData.equipment ?? [],
      materials: taskData.materials ?? [],
      certifications: taskData.certifications ?? [],
      safety_protocols: taskData.safetyProtocols ?? [],
      quality_standards: taskData.qualityStandards ?? [],
      client_visibility: taskData.clientVisibility ?? false,
    })
    if (!error) {
      setShowEditModal(false)
      setDetailTask(null)
      await fetchTasks()
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
    <div className="space-y-6" onClick={() => statusDropdownId && setStatusDropdownId(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tasks</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage project tasks</p>
        </div>
        <button
          onClick={() => setShowAddTaskModal(true)}
          className="inline-flex items-center cursor-pointer gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Add Task
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <div className="text-lg font-bold text-gray-600 dark:text-gray-400">{todoCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">To Do</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <div className="text-lg font-bold text-blue-600">{inProgressCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">In Progress</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <div className="text-lg font-bold text-green-600">{doneCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Done</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
          <div className={`text-lg font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`}>{overdueCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Overdue</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'done', label: 'Completed' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterStatus === f.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 animate-pulse flex gap-3">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-12 text-center">
          <CheckIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
            {filterStatus === 'done' ? 'No completed tasks yet' : 'No active tasks'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {filterStatus !== 'done' ? 'Add tasks to track work on this project' : 'Complete some tasks to see them here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const overdue = isOverdue(task)
            const isSelected = selectedIds.has(task.id)
            return (
              <div
                key={task.id}
                onClick={() => !selectedIds.size && setDetailTask(task)}
                className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border rounded-lg hover:shadow-md dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all cursor-pointer ${isSelected ? 'border-blue-300' : 'border-gray-200 dark:border-gray-700 dark:hover:border-gray-500'}`}
                style={isSelected ? { backgroundColor: 'rgba(219,234,254,0.4)' } : {}}
              >
                {/* Checkbox */}
                <button
                  onClick={e => { e.stopPropagation(); toggleSelect(task.id) }}
                  className="shrink-0"
                >
                  {isSelected
                    ? <div className="h-6 w-6 rounded border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                        <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    : task.status === 'completed'
                      ? <div className="h-6 w-6 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center">
                          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      : <div className="h-6 w-6 rounded border-2 border-gray-300 hover:border-blue-500" />
                  }
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                      {task.title}
                    </h4>
                    <div className="relative shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setStatusDropdownId(statusDropdownId === task.id ? null : task.id) }}
                        className={`text-xs font-semibold px-2 py-1 rounded-md border transition-colors ${
                          task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-900/60' :
                          task.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-500 dark:hover:bg-blue-900/60' :
                          task.status === 'review' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-500 dark:hover:bg-purple-900/60' :
                          task.status === 'blocked' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 dark:border-red-500 dark:hover:bg-red-900/60' :
                          'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[task.status]} ▾
                      </button>
                      {statusDropdownId === task.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                          {(Object.entries(STATUS_LABELS) as [Task['status'], string][]).map(([val, label]) => (
                            <button
                              key={val}
                              onClick={e => { e.stopPropagation(); updateTaskStatus(task.id, val) }}
                              className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 ${task.status === val ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                val === 'completed' ? 'bg-green-500' :
                                val === 'in-progress' ? 'bg-blue-500' :
                                val === 'review' ? 'bg-purple-500' :
                                val === 'blocked' ? 'bg-red-500' : 'bg-gray-400'
                              }`} />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.due_date && (
                      <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                        <ClockIcon className="h-3 w-3" />
                        {overdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}
                      </span>
                    )}
                    {task.trade && (
                      <span className="text-xs text-gray-400">{task.trade}</span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDeleteId(task.id) }}
                  className="shrink-0 p-1 text-gray-300 hover:text-red-500 rounded"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Task Detail Panel */}
      {detailTask && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDetailTask(null)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Task Details</h3>
              <button onClick={() => setDetailTask(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Title & Description */}
              <div>
                <p className={`text-lg font-semibold ${detailTask.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  {detailTask.title}
                </p>
                {detailTask.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{detailTask.description}</p>
                )}
              </div>

              {/* Status & Priority */}
              <section>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-gray-100 dark:border-gray-700">Overview</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Status</p><span className="font-medium text-gray-700 dark:text-gray-300">{STATUS_LABELS[detailTask.status]}</span></div>
                  <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Priority</p><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[detailTask.priority]}`}>{detailTask.priority}</span></div>
                  {detailTask.trade && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Trade</p><span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{detailTask.trade}</span></div>}
                  {detailTask.phase && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Phase</p><span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{detailTask.phase.replace('-', ' ')}</span></div>}
                  {detailTask.location && <div className="col-span-2"><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Location</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.location}</span></div>}
                </div>
              </section>

              {/* Scheduling */}
              <section>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-gray-100 dark:border-gray-700">Scheduling</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detailTask.start_date && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Start Date</p><span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(detailTask.start_date)}</span></div>}
                  <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Due Date</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.due_date ? formatDate(detailTask.due_date) : '—'}</span></div>
                  {detailTask.duration != null && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Duration</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.duration}d</span></div>}
                  {detailTask.estimated_hours != null && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Est. Hours</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.estimated_hours}h</span></div>}
                  {detailTask.actual_hours != null && detailTask.actual_hours > 0 && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Actual Hours</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.actual_hours}h</span></div>}
                  {detailTask.progress != null && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Progress</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.progress}%</span></div>}
                </div>
              </section>

              {/* Resources */}
              {(detailTask.assignee_name || detailTask.crew_size || (detailTask.equipment?.length ?? 0) > 0 || (detailTask.materials?.length ?? 0) > 0) && (
                <section>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-gray-100 dark:border-gray-700">Resources</p>
                  <div className="space-y-2 text-sm">
                    {detailTask.assignee_name && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Assignee</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.assignee_name}</span></div>}
                    {detailTask.crew_size != null && detailTask.crew_size > 0 && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Crew Size</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.crew_size}</span></div>}
                    {(detailTask.equipment?.length ?? 0) > 0 && (
                      <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Equipment</p>
                        <div className="flex flex-wrap gap-1 mt-1">{detailTask.equipment!.map(e => <span key={e} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{e}</span>)}</div>
                      </div>
                    )}
                    {(detailTask.materials?.length ?? 0) > 0 && (
                      <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Materials</p>
                        <div className="flex flex-wrap gap-1 mt-1">{detailTask.materials!.map(m => <span key={m} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{m}</span>)}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Quality & Safety */}
              {(detailTask.inspection_required || detailTask.weather_dependent || (detailTask.safety_protocols?.length ?? 0) > 0 || (detailTask.certifications?.length ?? 0) > 0) && (
                <section>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-gray-100 dark:border-gray-700">Quality & Safety</p>
                  <div className="space-y-2 text-sm">
                    {detailTask.inspection_required && (
                      <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Inspection</p>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.inspection_type ?? 'Required'}</span>
                      </div>
                    )}
                    {detailTask.weather_dependent && (
                      <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Weather Dependent</p>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Yes{detailTask.weather_buffer ? ` · ${detailTask.weather_buffer}d buffer` : ''}</span>
                      </div>
                    )}
                    {(detailTask.certifications?.length ?? 0) > 0 && (
                      <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Certifications</p>
                        <div className="flex flex-wrap gap-1 mt-1">{detailTask.certifications!.map(c => <span key={c} className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded">{c}</span>)}</div>
                      </div>
                    )}
                    {(detailTask.safety_protocols?.length ?? 0) > 0 && (
                      <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Safety Protocols</p>
                        <div className="flex flex-wrap gap-1 mt-1">{detailTask.safety_protocols!.map(s => <span key={s} className="text-xs bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300 px-1.5 py-0.5 rounded">{s}</span>)}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Meta */}
              <section>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-gray-100 dark:border-gray-700">Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Created</p><span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(detailTask.created_at)}</span></div>
                  {detailTask.dependencies != null && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Dependencies</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.dependencies.length}</span></div>}
                  {detailTask.client_visibility != null && <div><p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Client Visible</p><span className="font-medium text-gray-700 dark:text-gray-300">{detailTask.client_visibility ? 'Yes' : 'No'}</span></div>}
                </div>
              </section>
            </div>
            <div className="px-5 py-4 border-t dark:border-gray-700 flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => setConfirmDeleteId(detailTask.id)}
                className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium cursor-pointer hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <TaskCreationModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          onSave={handleAddTask}
          editingTask={null}
          projects={[{ id: project.id, name: project.name ?? '' }]}
          teamMembers={project.teamMembers.map(m => ({
            id: m.id,
            name: m.name,
            avatar: m.avatar || '',
            role: m.role,
            trades: []
          }))}
          existingTasks={tasks.map(toModalTask)}
        />
      )}

      {/* Edit Task Modal */}
      {showEditModal && detailTask && (
        <TaskCreationModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
          editingTask={toModalTask(detailTask)}
          projects={[{ id: project.id, name: project.name ?? '' }]}
          teamMembers={[]}
          existingTasks={tasks.map(toModalTask)}
        />
      )}

      {/* Floating selection bar */}
      {selectedIds.size > 0 && (() => {
        const selTasks = tasks.filter(t => selectedIds.has(t.id))
        const hasIncomplete = selTasks.some(t => t.status !== 'completed')
        const hasComplete = selTasks.some(t => t.status === 'completed')
        return (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
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
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Mark Active
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Clear
            </button>
          </div>
        )
      })()}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setConfirmDeleteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-80 pointer-events-auto">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Delete Task</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTask(confirmDeleteId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
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
