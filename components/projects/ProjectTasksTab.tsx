'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import {
  ClockIcon,
  XMarkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/outline'
import TaskCreationModal from '@/components/dashboard/TaskCreationModal'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked' | 'review'
  priority: 'low' | 'medium' | 'high' | 'critical' | null
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
  design_selection_id: string | null
  selection_task_type: 'order' | 'delivery' | 'installation' | null
  blocking_rfi_id: string | null
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
  refreshKey?: number
  onMutate?: () => void
}

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null
  const isUrgent = priority === 'critical' || priority === 'high'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
      {isUrgent ? 'Urgent' : 'Not Urgent'}
    </span>
  )
}

const PRIORITY_COLORS: Record<string, string> = {
  low:      'bg-slate-100 text-slate-600',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<Task['status'], string> = {
  'not-started': 'To Do',
  'in-progress': 'In Progress',
  'completed':   'Done',
  'blocked':     'Blocked',
  'review':      'In Review',
}

// Construction phase order — drives grouping sequence
const PHASE_ORDER = [
  'pre-construction',
  'foundation',
  'framing',
  'mep',
  'finishing',
  'closeout',
]

const PHASE_LABELS: Record<string, string> = {
  'pre-construction': 'Pre-Construction',
  'foundation':       'Foundation',
  'framing':          'Framing',
  'mep':              'MEP',
  'finishing':        'Finishing',
  'closeout':         'Closeout',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(task: Task) {
  return !!(task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date())
}

// Deterministic avatar color from name — avoids random color flicker on re-render
function avatarColor(name: string) {
  const palette = ['#6366F1','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

export default function ProjectTasksTab({ project, refreshKey = 0, onMutate }: Props) {
  const { colors, darkMode } = useThemeColors()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'done'>('all')
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)

  // Build avatar lookup from project team members — avoids extra queries
  const memberAvatarMap = Object.fromEntries(
    project.teamMembers.map(m => [m.id, { avatar: m.avatar, name: m.name }])
  )

  useEffect(() => {
    fetchTasks()
  }, [project.id, refreshKey])

  async function fetchTasks() {
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`)
      if (!res.ok) throw new Error(await res.text())
      const { tasks: data } = await res.json()
      const fetched = (data ?? []) as Task[]
      setTasks(fetched)
      syncProgress(fetched)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setTasks([])
      toast.error('Failed to load tasks.')
    }
  }

  function calcProgress(currentTasks: Task[]) {
    if (currentTasks.length === 0) return 0
    const completed = currentTasks.filter(t => t.status === 'completed').length
    return Math.round((completed / currentTasks.length) * 100)
  }

  function syncProgress(currentTasks: Task[]) {
    if (currentTasks.length === 0) return
    const progress = calcProgress(currentTasks)
    window.dispatchEvent(new CustomEvent('project-progress-update', { detail: { progress } }))
    const supabase = createClient()
    supabase.from('projects')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', project.id)
  }

  async function updateTaskStatus(taskId: string, status: Task['status']) {
    // Enforce procurement pipeline sequence
    if (status !== 'not-started') {
      const task = tasks?.find(t => t.id === taskId)
      if (task?.design_selection_id && task.selection_task_type) {
        const linked = (tasks ?? []).filter(t => t.design_selection_id === task.design_selection_id)
        const prereq =
          task.selection_task_type === 'delivery'     ? linked.find(t => t.selection_task_type === 'order')    :
          task.selection_task_type === 'installation' ? linked.find(t => t.selection_task_type === 'delivery') :
          null
        if (prereq && prereq.status !== 'completed') {
          toast.error(`Complete "${prereq.title}" first`)
          setStatusDropdownId(null)
          return
        }
      }
    }

    const prevTask = tasks?.find(t => t.id === taskId)
    const prevTasks = tasks ?? []
    const wasCompleted = prevTask?.status === 'completed'
    const becomingIncomplete = wasCompleted && status !== 'completed'

    // Optimistic update — UI responds instantly
    const optimisticTask = { ...prevTask!, status }
    const optimisticTasks = prevTasks.map(t => t.id === taskId ? optimisticTask : t)
    setTasks(optimisticTasks)
    syncProgress(optimisticTasks)
    if (detailTask?.id === taskId) setDetailTask(optimisticTask)
    setStatusDropdownId(null)

    // Network request in background
    const res = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (json.task) {
      // Reconcile with server response (picks up updated_at etc.)
      const updatedTask = json.task as Task
      const reconciledTasks = (tasks ?? []).map(t => t.id === taskId ? updatedTask : t)
      setTasks(reconciledTasks)
      syncProgress(reconciledTasks)
      if (detailTask?.id === taskId) setDetailTask(updatedTask)

      if (status === 'completed' && updatedTask.design_selection_id && updatedTask.selection_task_type) {
        await syncSelectionOnTaskComplete(updatedTask)
        onMutate?.()
      } else if (becomingIncomplete && prevTask?.design_selection_id && prevTask?.selection_task_type) {
        await revertSelectionOnTaskUncomplete(prevTask)
        onMutate?.()
      }
    } else {
      // Rollback on failure
      setTasks(prevTasks)
      syncProgress(prevTasks)
      if (detailTask?.id === taskId && prevTask) setDetailTask(prevTask)
      toast.error('Failed to update task status')
    }
  }

  async function revertSelectionOnTaskUncomplete(task: Task) {
    const supabase = createClient()

    const revertStatusMap: Record<string, string> = {
      order:        'approved',
      delivery:     'ordered',
      installation: 'received',
    }
    const revertStatus = revertStatusMap[task.selection_task_type!]
    if (!revertStatus) return

    await supabase.from('design_selections')
      .update({ status: revertStatus })
      .eq('id', task.design_selection_id)

    // Delete the auto-created expense for this task type
    if (task.selection_task_type === 'order') {
      await supabase.from('project_expenses')
        .delete()
        .eq('design_selection_id', task.design_selection_id)
        .eq('category', 'materials')
    } else if (task.selection_task_type === 'installation') {
      await supabase.from('project_expenses')
        .delete()
        .eq('design_selection_id', task.design_selection_id)
        .eq('category', 'labor')
    }
  }

  async function syncSelectionOnTaskComplete(task: Task) {
    const supabase = createClient()
    const selection = project.designSelections?.find(s => s.id === task.design_selection_id)
    if (!selection) return

    const selectionStatusMap: Record<string, string> = {
      order:        'ordered',
      delivery:     'received',
      installation: 'installed',
    }
    const newStatus = selectionStatusMap[task.selection_task_type!]
    if (!newStatus) return

    // Update selection status
    await supabase
      .from('design_selections')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', selection.id)

    const today = new Date().toISOString().split('T')[0]

    // Auto-create expense: material cost on order, installation labor on install
    if (task.selection_task_type === 'order' && selection.price > 0) {
      // Check no expense already exists for this selection (avoid double-create)
      const { data: existing } = await supabase
        .from('project_expenses')
        .select('id')
        .eq('project_id', project.id)
        .eq('design_selection_id', selection.id)
        .eq('category', 'materials')
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('project_expenses').insert({
          project_id:           project.id,
          category:             'materials',
          description:          `${selection.option_name}${selection.room_location ? ` — ${selection.room_location}` : ''}`,
          amount:               selection.price,
          date:                 today,
          vendor:               selection.manufacturer || null,
          payment_status:       'pending',
          design_selection_id:  selection.id,
        })
      }
    } else if (task.selection_task_type === 'installation' && selection.installation_cost > 0) {
      const { data: existing } = await supabase
        .from('project_expenses')
        .select('id')
        .eq('project_id', project.id)
        .eq('design_selection_id', selection.id)
        .eq('category', 'labor')
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('project_expenses').insert({
          project_id:           project.id,
          category:             'labor',
          description:          `Installation — ${selection.option_name}`,
          amount:               selection.installation_cost,
          date:                 today,
          payment_status:       'pending',
          design_selection_id:  selection.id,
        })
      }
    }
  }

  async function deleteTask(id: string) {
    await fetch(`/api/projects/${project.id}/tasks/${id}`, { method: 'DELETE' })
    const updated = (tasks ?? []).filter(t => t.id !== id)
    setTasks(updated)
    setConfirmDeleteId(null)
    setDetailTask(null)
    syncProgress(updated)
    onMutate?.()
  }

  async function handleAddTask(taskData: any) {
    const res = await fetch(`/api/projects/${project.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:               taskData.title,
        description:         taskData.description || null,
        project_name:        project.name,
        trade:               taskData.trade || 'general',
        phase:               taskData.phase || 'pre-construction',
        priority:            taskData.priority || null,
        status:              taskData.status || 'not-started',
        assignee_id:         taskData.assigneeId || null,
        assignee_name:       taskData.assignee || null,
        assignee_avatar:     taskData.assigneeAvatar || null,
        start_date:          taskData.startDate || null,
        due_date:            taskData.dueDate || new Date().toISOString().split('T')[0],
        duration:            taskData.duration || 1,
        progress:            taskData.progress || 0,
        estimated_hours:     taskData.estimatedHours || 8,
        actual_hours:        taskData.actualHours || 0,
        dependencies:        taskData.dependencies || [],
        attachments:         taskData.attachments || 0,
        comments:            taskData.comments || 0,
        location:            taskData.location || null,
        weather_dependent:   taskData.weatherDependent || false,
        weather_buffer:      taskData.weatherBuffer || 0,
        inspection_required: taskData.inspectionRequired || false,
        inspection_type:     taskData.inspectionType || null,
        crew_size:           taskData.crewSize || 1,
        equipment:           taskData.equipment || [],
        materials:           taskData.materials || [],
        certifications:      taskData.certifications || [],
        safety_protocols:    taskData.safetyProtocols || [],
        quality_standards:   taskData.qualityStandards || [],
        documentation:       taskData.documentation || [],
        notify_inspector:    taskData.notifyInspector || false,
        client_visibility:   taskData.clientVisibility || false,
      }),
    })
    if (res.ok) {
      setShowAddTaskModal(false)
      await fetchTasks()
      onMutate?.()
    }
  }

  async function handleEditSave(taskData: any) {
    if (!detailTask) return
    const res = await fetch(`/api/projects/${project.id}/tasks/${detailTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:               taskData.title,
        description:         taskData.description || null,
        trade:               taskData.trade,
        phase:               taskData.phase || undefined,
        priority:            taskData.priority,
        status:              taskData.status,
        assignee_id:         taskData.assigneeId || null,
        assignee_name:       taskData.assignee || null,
        start_date:          taskData.startDate || null,
        due_date:            taskData.dueDate || null,
        duration:            taskData.duration ?? 0,
        progress:            taskData.progress ?? 0,
        estimated_hours:     taskData.estimatedHours ?? 0,
        actual_hours:        taskData.actualHours ?? 0,
        dependencies:        taskData.dependencies ?? [],
        location:            taskData.location || null,
        weather_dependent:   taskData.weatherDependent ?? false,
        weather_buffer:      taskData.weatherBuffer ?? 0,
        inspection_required: taskData.inspectionRequired ?? false,
        inspection_type:     taskData.inspectionType || null,
        crew_size:           taskData.crewSize ?? 1,
        equipment:           taskData.equipment ?? [],
        materials:           taskData.materials ?? [],
        certifications:      taskData.certifications ?? [],
        safety_protocols:    taskData.safetyProtocols ?? [],
        quality_standards:   taskData.qualityStandards ?? [],
        client_visibility:   taskData.clientVisibility ?? false,
      }),
    })
    if (res.ok) {
      setShowEditModal(false)
      setDetailTask(null)
      await fetchTasks()
      onMutate?.()
    }
  }

  function toModalTask(t: Task) {
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      project: project.name ?? '',
      projectId: project.id,
      trade: (t.trade ?? 'general') as any,
      phase: (t.phase ?? 'pre-construction') as any,
      priority: (t.priority ?? 'medium') as any,
      status: t.status,
      assignee: t.assignee_name ?? '',
      assigneeId: t.assignee_id ?? '',
      assigneeAvatar: memberAvatarMap[t.assignee_id ?? '']?.avatar ?? '',
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

  function togglePhase(phase: string) {
    setCollapsedPhases(prev => {
      const next = new Set(prev)
      next.has(phase) ? next.delete(phase) : next.add(phase)
      return next
    })
  }

  if (tasks === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  // Apply status filter
  const filtered = tasks.filter(t => {
    if (filterStatus === 'active') return t.status !== 'completed'
    if (filterStatus === 'done')   return t.status === 'completed'
    return true
  })

  // Blocked tasks — always drawn from all tasks (not the filtered set) so the
  // alert strip is visible regardless of the active filter
  const blockedTasks = tasks.filter(t => t.status === 'blocked')

  // Group filtered tasks by phase in construction sequence
  const phaseGroups = PHASE_ORDER
    .map(phase => ({
      key:   phase,
      label: PHASE_LABELS[phase],
      tasks: filtered.filter(t => t.phase === phase),
    }))
    .filter(g => g.tasks.length > 0)

  // Tasks that have no recognised phase go at the bottom under "Other"
  const unassignedTasks = filtered.filter(
    t => !t.phase || !PHASE_ORDER.includes(t.phase)
  )
  if (unassignedTasks.length > 0) {
    phaseGroups.push({ key: 'other', label: 'Other', tasks: unassignedTasks })
  }

  // Stat card counts
  const todoCount       = tasks.filter(t => t.status === 'not-started').length
  const inProgressCount = tasks.filter(t => t.status === 'in-progress' || t.status === 'review').length
  const doneCount       = tasks.filter(t => t.status === 'completed').length
  const overdueCount    = tasks.filter(isOverdue).length

  return (
    <div className="space-y-6" onClick={() => statusDropdownId && setStatusDropdownId(null)}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: colors.text }}>Tasks</h2>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Project progress by phase — {doneCount} of {tasks.length} tasks complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/taskflow"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: colors.textMuted, border: colors.border }}
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            TaskFlow
          </Link>
          <button
            onClick={() => setShowAddTaskModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.card, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: darkMode ? 'rgba(75,85,99,0.2)' : '#F3F4F6' }}>
              <ClockIcon className="w-5 h-5" style={{ color: darkMode ? '#9CA3AF' : '#6B7280' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>To Do</div>
              <div className="text-lg font-bold" style={{ color: colors.text }}>{todoCount}</div>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full" style={{ width: `${tasks.length ? (todoCount / tasks.length) * 100 : 0}%`, backgroundColor: '#6B7280' }} />
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ backgroundColor: colors.card, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}>
              <PencilIcon className="w-5 h-5" style={{ color: '#2563EB' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>In Progress</div>
              <div className="text-lg font-bold" style={{ color: '#2563EB' }}>{inProgressCount}</div>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full" style={{ width: `${tasks.length ? (inProgressCount / tasks.length) * 100 : 0}%`, backgroundColor: '#2563EB' }} />
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ backgroundColor: colors.card, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
              <CheckIcon className="w-5 h-5" style={{ color: '#16A34A' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Done</div>
              <div className="text-lg font-bold" style={{ color: '#16A34A' }}>{doneCount}</div>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full" style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%`, backgroundColor: '#16A34A' }} />
          </div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
            {tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0}% complete
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ backgroundColor: colors.card, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: overdueCount > 0 ? 'rgba(220,38,38,0.1)' : (darkMode ? 'rgba(75,85,99,0.2)' : '#F3F4F6') }}>
              <XMarkIcon className="w-5 h-5" style={{ color: overdueCount > 0 ? '#DC2626' : (darkMode ? '#6B7280' : '#9CA3AF') }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Overdue</div>
              <div className="text-lg font-bold" style={{ color: overdueCount > 0 ? '#DC2626' : colors.textMuted }}>{overdueCount}</div>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full" style={{ width: `${tasks.length ? (overdueCount / tasks.length) * 100 : 0}%`, backgroundColor: overdueCount > 0 ? '#DC2626' : '#9CA3AF' }} />
          </div>
        </div>
      </div>

      {/* ── Blocked Alert Strip ── */}
      {blockedTasks.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: darkMode ? 'rgba(220,38,38,0.1)' : '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: '#DC2626' }}>
                {blockedTasks.length} blocked {blockedTasks.length === 1 ? 'task' : 'tasks'} — action required
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {blockedTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setDetailTask(t)}
                    className="text-sm hover:underline text-left"
                    style={{ color: darkMode ? '#FCA5A5' : '#991B1B' }}
                  >
                    • {t.title}
                    {t.phase && (
                      <span className="ml-1 text-xs opacity-70">
                        [{PHASE_LABELS[t.phase] ?? t.phase}]
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex gap-2">
        {([
          { key: 'all',    label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'done',   label: 'Completed' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={filterStatus === f.key
              ? { backgroundColor: '#2563EB', color: '#FFFFFF' }
              : { backgroundColor: darkMode ? '#1f2937' : '#F3F4F6', color: colors.textMuted }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Phase Groups ── */}
      {filtered.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ backgroundColor: colors.card, border: colors.border }}>
          <CheckIcon className="h-12 w-12 mx-auto mb-4" style={{ color: darkMode ? '#374151' : '#D1D5DB' }} />
          <h3 className="text-base font-medium mb-1" style={{ color: colors.text }}>
            {filterStatus === 'done' ? 'No completed tasks yet' : 'No active tasks'}
          </h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            {filterStatus !== 'done' ? 'Add tasks to start tracking work on this project' : 'Complete some tasks to see them here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {phaseGroups.map(group => {
            const isCollapsed = collapsedPhases.has(group.key)
            const groupDone     = group.tasks.filter(t => t.status === 'completed').length
            const groupBlocked  = group.tasks.filter(t => t.status === 'blocked').length
            const groupOverdue  = group.tasks.filter(isOverdue).length
            const completePct   = group.tasks.length ? Math.round((groupDone / group.tasks.length) * 100) : 0

            return (
              <div key={group.key} className="rounded-lg overflow-hidden" style={{ border: colors.border }}>
                {/* Phase Header */}
                <button
                  onClick={() => togglePhase(group.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
                  style={{ backgroundColor: darkMode ? colors.bgAlt : '#F9FAFB', borderBottom: isCollapsed ? 'none' : colors.borderBottom }}
                >
                  {isCollapsed
                    ? <ChevronRightIcon className="h-4 w-4 shrink-0" style={{ color: colors.textMuted }} />
                    : <ChevronDownIcon  className="h-4 w-4 shrink-0" style={{ color: colors.textMuted }} />
                  }

                  <span className="text-sm font-semibold" style={{ color: colors.text }}>
                    {group.label}
                  </span>

                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB', color: colors.textMuted }}>
                    {groupDone}/{group.tasks.length}
                  </span>

                  {/* Per-phase progress bar */}
                  <div className="flex-1 max-w-32 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${completePct}%`,
                        backgroundColor: completePct === 100 ? '#16A34A' : '#2563EB',
                      }}
                    />
                  </div>

                  <span className="text-xs" style={{ color: colors.textMuted }}>{completePct}%</span>

                  {/* Inline badges for blocked / overdue — only show if relevant */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {groupBlocked > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: darkMode ? 'rgba(220,38,38,0.2)' : '#FEE2E2', color: '#DC2626' }}>
                        {groupBlocked} blocked
                      </span>
                    )}
                    {groupOverdue > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: darkMode ? 'rgba(245,158,11,0.2)' : '#FEF3C7', color: '#D97706' }}>
                        {groupOverdue} overdue
                      </span>
                    )}
                  </div>
                </button>

                {/* Task Rows */}
                {!isCollapsed && (
                  <div className="divide-y" style={{ borderColor: darkMode ? '#1f2937' : '#F3F4F6' }}>
                    {group.tasks.map(task => {
                      const overdue = isOverdue(task)
                      const member  = memberAvatarMap[task.assignee_id ?? '']

                      return (
                        <div
                          key={task.id}
                          onClick={() => setDetailTask(task)}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                          style={{
                            backgroundColor: colors.bg,
                            borderLeft: task.status === 'blocked' ? '3px solid #DC2626' : '3px solid transparent',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = darkMode ? colors.bgAlt : '#F9FAFB')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.bg)}
                        >
                          {/* Status toggle button */}
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              updateTaskStatus(task.id, task.status === 'completed' ? 'not-started' : 'completed')
                            }}
                            className="shrink-0"
                            title={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {task.status === 'completed'
                              ? <div className="h-5 w-5 rounded-full border-2 border-green-500 bg-green-500 flex items-center justify-center">
                                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              : <div className="h-5 w-5 rounded-full border-2 hover:border-blue-500 transition-colors" style={{ borderColor: darkMode ? '#4B5563' : '#D1D5DB' }} />
                            }
                          </button>

                          {/* Title + meta */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through' : ''}`}
                                style={{ color: task.status === 'completed' ? colors.textMuted : colors.text }}
                              >
                                {task.title}
                              </span>
                              {task.selection_task_type && (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: darkMode ? 'rgba(14,165,233,0.15)' : '#F0F9FF', color: '#0EA5E9' }}>
                                  {task.selection_task_type === 'order' ? 'Order' : task.selection_task_type === 'delivery' ? 'Delivery' : 'Install'}
                                </span>
                              )}
                              {task.inspection_required && (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: darkMode ? 'rgba(139,92,246,0.2)' : '#EDE9FE', color: '#7C3AED' }}>
                                  Inspection
                                </span>
                              )}
                              {task.blocking_rfi_id && task.status === 'blocked' && (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: darkMode ? 'rgba(220,38,38,0.2)' : '#FEF2F2', color: '#DC2626' }}>
                                  Blocked · RFI
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <PriorityBadge priority={task.priority} />
                              {task.trade && (
                                <span className="text-xs" style={{ color: colors.textMuted }}>{task.trade}</span>
                              )}
                              {task.due_date && (
                                <span className={`text-xs flex items-center gap-0.5 ${overdue ? 'font-medium' : ''}`} style={{ color: overdue ? '#DC2626' : colors.textMuted }}>
                                  <ClockIcon className="h-3 w-3" />
                                  {overdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Assignee avatar */}
                          {(task.assignee_name || member) && (
                            <div className="shrink-0 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0"
                                style={{ backgroundColor: avatarColor(task.assignee_name ?? 'X') }}
                                title={task.assignee_name ?? ''}
                              >
                                {member?.avatar
                                  ? <img src={member.avatar} alt={task.assignee_name ?? ''} className="w-full h-full object-cover" />
                                  : (task.assignee_name?.[0] ?? '?').toUpperCase()
                                }
                              </div>
                              <span className="text-xs hidden sm:block max-w-20 truncate" style={{ color: colors.textMuted }}>
                                {task.assignee_name}
                              </span>
                            </div>
                          )}

                          {/* Status dropdown */}
                          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setStatusDropdownId(statusDropdownId === task.id ? null : task.id)}
                              className="text-xs font-semibold px-2 py-1 rounded-md border transition-colors cursor-pointer"
                              style={
                                task.status === 'completed' ? { backgroundColor: darkMode ? 'rgba(22,163,74,0.2)' : '#F0FDF4', color: '#16A34A', borderColor: '#86EFAC' } :
                                task.status === 'in-progress' ? { backgroundColor: darkMode ? 'rgba(37,99,235,0.2)' : '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' } :
                                task.status === 'blocked' ? { backgroundColor: darkMode ? 'rgba(220,38,38,0.2)' : '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' } :
                                task.status === 'review' ? { backgroundColor: darkMode ? 'rgba(124,58,237,0.2)' : '#F5F3FF', color: '#7C3AED', borderColor: '#DDD6FE' } :
                                { backgroundColor: darkMode ? '#374151' : '#F9FAFB', color: colors.textMuted, borderColor: darkMode ? '#4B5563' : '#E5E7EB' }
                              }
                            >
                              {STATUS_LABELS[task.status]} ▾
                            </button>
                            {statusDropdownId === task.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 rounded-lg shadow-lg z-20 overflow-hidden" style={{ backgroundColor: colors.bg, border: colors.border }}>
                                {(Object.entries(STATUS_LABELS) as [Task['status'], string][]).map(([val, label]) => (
                                  <button
                                    key={val}
                                    onClick={() => updateTaskStatus(task.id, val)}
                                    className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                                    style={{
                                      color: task.status === val ? '#2563EB' : colors.text,
                                      backgroundColor: task.status === val ? (darkMode ? 'rgba(37,99,235,0.1)' : '#EFF6FF') : 'transparent',
                                    }}
                                    onMouseEnter={e => { if (task.status !== val) e.currentTarget.style.backgroundColor = darkMode ? colors.bgAlt : '#F9FAFB' }}
                                    onMouseLeave={e => { if (task.status !== val) e.currentTarget.style.backgroundColor = 'transparent' }}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      val === 'completed'   ? 'bg-green-500' :
                                      val === 'in-progress' ? 'bg-blue-500' :
                                      val === 'review'      ? 'bg-purple-500' :
                                      val === 'blocked'     ? 'bg-red-500' : 'bg-gray-400'
                                    }`} />
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Delete */}
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDeleteId(task.id) }}
                            className="shrink-0 p-1 rounded transition-colors"
                            style={{ color: darkMode ? '#4B5563' : '#D1D5DB' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = darkMode ? '#4B5563' : '#D1D5DB')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Task Detail Panel ── */}
      {detailTask && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDetailTask(null)} />
          <div className="fixed right-0 top-0 h-full w-96 shadow-xl z-50 flex flex-col" style={{ backgroundColor: colors.bg }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: colors.borderBottom }}>
              <h3 className="text-base font-semibold" style={{ color: colors.text }}>Task Details</h3>
              <button onClick={() => setDetailTask(null)} style={{ color: colors.textMuted }} className="hover:opacity-70">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <p className={`text-lg font-semibold ${detailTask.status === 'completed' ? 'line-through' : ''}`} style={{ color: detailTask.status === 'completed' ? colors.textMuted : colors.text }}>
                  {detailTask.title}
                </p>
                {detailTask.description && (
                  <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{detailTask.description}</p>
                )}
              </div>

              <section>
                <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5" style={{ color: colors.textMuted, borderBottom: colors.borderBottom }}>Overview</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Status</p>
                    <span className="font-medium" style={{ color: colors.text }}>{STATUS_LABELS[detailTask.status]}</span>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Priority</p>
                    <PriorityBadge priority={detailTask.priority} />
                  </div>
                  {detailTask.trade && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Trade</p>
                      <span className="font-medium capitalize" style={{ color: colors.text }}>{detailTask.trade}</span>
                    </div>
                  )}
                  {detailTask.phase && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Phase</p>
                      <span className="font-medium" style={{ color: colors.text }}>{PHASE_LABELS[detailTask.phase] ?? detailTask.phase}</span>
                    </div>
                  )}
                  {detailTask.location && (
                    <div className="col-span-2">
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Location</p>
                      <span className="font-medium" style={{ color: colors.text }}>{detailTask.location}</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5" style={{ color: colors.textMuted, borderBottom: colors.borderBottom }}>Scheduling</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detailTask.start_date && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Start</p>
                      <span className="font-medium" style={{ color: colors.text }}>{formatDate(detailTask.start_date)}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Due</p>
                    <span className={`font-medium ${isOverdue(detailTask) ? 'text-red-600' : ''}`} style={isOverdue(detailTask) ? {} : { color: colors.text }}>
                      {detailTask.due_date ? formatDate(detailTask.due_date) : '—'}
                    </span>
                  </div>
                  {detailTask.estimated_hours != null && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Est. Hours</p>
                      <span className="font-medium" style={{ color: colors.text }}>{detailTask.estimated_hours}h</span>
                    </div>
                  )}
                  {detailTask.actual_hours != null && detailTask.actual_hours > 0 && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Actual Hours</p>
                      <span className="font-medium" style={{ color: colors.text }}>{detailTask.actual_hours}h</span>
                    </div>
                  )}
                </div>
              </section>

              {(detailTask.assignee_name || detailTask.crew_size || (detailTask.equipment?.length ?? 0) > 0 || (detailTask.materials?.length ?? 0) > 0) && (
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5" style={{ color: colors.textMuted, borderBottom: colors.borderBottom }}>Resources</p>
                  <div className="space-y-2 text-sm">
                    {detailTask.assignee_name && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0"
                          style={{ backgroundColor: avatarColor(detailTask.assignee_name) }}>
                          {memberAvatarMap[detailTask.assignee_id ?? '']?.avatar
                            ? <img src={memberAvatarMap[detailTask.assignee_id ?? '']!.avatar!} alt="" className="w-full h-full object-cover" />
                            : detailTask.assignee_name[0].toUpperCase()
                          }
                        </div>
                        <span style={{ color: colors.text }}>{detailTask.assignee_name}</span>
                      </div>
                    )}
                    {detailTask.crew_size != null && detailTask.crew_size > 1 && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Crew Size</p>
                        <span className="font-medium" style={{ color: colors.text }}>{detailTask.crew_size}</span>
                      </div>
                    )}
                    {(detailTask.equipment?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Equipment</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {detailTask.equipment!.map(e => (
                            <span key={e} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgAlt, color: colors.text }}>{e}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(detailTask.materials?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Materials</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {detailTask.materials!.map(m => (
                            <span key={m} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgAlt, color: colors.text }}>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {(detailTask.inspection_required || detailTask.weather_dependent || (detailTask.safety_protocols?.length ?? 0) > 0 || (detailTask.certifications?.length ?? 0) > 0) && (
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5" style={{ color: colors.textMuted, borderBottom: colors.borderBottom }}>Quality & Safety</p>
                  <div className="space-y-2 text-sm">
                    {detailTask.inspection_required && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Inspection</p>
                        <span className="font-medium" style={{ color: colors.text }}>{detailTask.inspection_type ?? 'Required'}</span>
                      </div>
                    )}
                    {detailTask.weather_dependent && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Weather Dependent</p>
                        <span className="font-medium" style={{ color: colors.text }}>Yes{detailTask.weather_buffer ? ` · ${detailTask.weather_buffer}d buffer` : ''}</span>
                      </div>
                    )}
                    {(detailTask.certifications?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Certifications</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {detailTask.certifications!.map(c => (
                            <span key={c} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: darkMode ? 'rgba(37,99,235,0.15)' : '#EFF6FF', color: '#2563EB' }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(detailTask.safety_protocols?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Safety Protocols</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {detailTask.safety_protocols!.map(s => (
                            <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: darkMode ? 'rgba(245,158,11,0.15)' : '#FFFBEB', color: '#D97706' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section>
                <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5" style={{ color: colors.textMuted, borderBottom: colors.borderBottom }}>Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Created</p>
                    <span className="font-medium" style={{ color: colors.text }}>{formatDate(detailTask.created_at)}</span>
                  </div>
                  {detailTask.client_visibility != null && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Client Visible</p>
                      <span className="font-medium" style={{ color: colors.text }}>{detailTask.client_visibility ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="px-5 py-4 flex gap-2" style={{ borderTop: colors.borderBottom }}>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{ border: colors.border, color: colors.text }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = darkMode ? colors.bgAlt : '#F9FAFB')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => setConfirmDeleteId(detailTask.id)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                style={{ border: '1px solid #FECACA', color: '#DC2626' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Add Task Modal ── */}
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
            trades: [],
          }))}
          existingTasks={(tasks ?? []).map(toModalTask)}
        />
      )}

      {/* ── Edit Task Modal ── */}
      {showEditModal && detailTask && (
        <TaskCreationModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
          editingTask={toModalTask(detailTask)}
          projects={[{ id: project.id, name: project.name ?? '' }]}
          teamMembers={project.teamMembers.map(m => ({
            id: m.id,
            name: m.name,
            avatar: m.avatar || '',
            role: m.role,
            trades: [],
          }))}
          existingTasks={(tasks ?? []).map(toModalTask)}
        />
      )}

      {/* ── Confirm Delete ── */}
      {confirmDeleteId && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 z-9999" onClick={() => setConfirmDeleteId(null)} />
          <div className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <p className="text-sm font-medium text-center mb-1" style={{ color: colors.text }}>Delete this task?</p>
              <p className="text-xs text-center mb-5 truncate px-2" style={{ color: colors.textMuted }}>
                {tasks.find(t => t.id === confirmDeleteId)?.title}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteTask(confirmDeleteId)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>,
        document.getElementById('modal-portal-root') ?? document.body
      )}
    </div>
  )
}
