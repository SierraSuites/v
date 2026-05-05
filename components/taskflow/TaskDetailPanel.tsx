'use client'

// ============================================================
// TASK DETAIL PANEL — Slide-over with checklist, timer, comments
// Based on 05_TASKFLOW_QUALITY.md spec
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { XMarkIcon, ClockIcon, ChatBubbleLeftIcon, ListBulletIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ChecklistItem {
  id: string
  title: string
  is_completed: boolean
  sequence_order: number
}

interface TimeEntry {
  id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  notes: string | null
}

interface Comment {
  id: string
  comment: string
  created_at: string
  user_id: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string | null
  trade?: string
  estimatedHours?: number
  actualHours?: number
  dueDate?: string
  assignee?: string
  progress?: number
}

interface TaskDetailPanelProps {
  task: Task
  onClose: () => void
  onEdit?: () => void
  onStatusChange?: (taskId: string, newStatus: string) => void
}

type Tab = 'checklist' | 'time' | 'comments'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
]

export default function TaskDetailPanel({ task, onClose, onEdit, onStatusChange }: TaskDetailPanelProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('checklist')

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  // Time tracking
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [timerNotes, setTimerNotes] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Comments
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Status
  const [currentStatus, setCurrentStatus] = useState(task.status)
  const [savingStatus, setSavingStatus] = useState(false)

  useEffect(() => {
    loadChecklist()
    loadTimeEntries()
    loadComments()

    // Close on Escape
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [task.id])

  // Tick the running timer
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  async function loadChecklist() {
    const { data } = await supabase
      .from('task_checklist_items')
      .select('id, title, is_completed, sequence_order')
      .eq('task_id', task.id)
      .order('sequence_order')
    if (data) setChecklist(data)
  }

  async function loadTimeEntries() {
    const res = await fetch(`/api/taskflow/${task.id}/time`)
    if (res.ok) {
      const { data } = await res.json()
      setTimeEntries(data || [])
      const running = (data || []).find((e: TimeEntry) => !e.ended_at)
      if (running) {
        setTimerRunning(true)
        setElapsedSeconds(Math.floor((Date.now() - new Date(running.started_at).getTime()) / 1000))
      }
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from('task_comments')
      .select('id, comment, created_at, user_id')
      .eq('task_id', task.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(50)
    if (data) setComments(data)
  }

  // ── Checklist ────────────────────────────────────────────
  async function toggleChecklistItem(item: ChecklistItem) {
    const updated = !item.is_completed
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: updated } : i))
    await supabase
      .from('task_checklist_items')
      .update({ is_completed: updated })
      .eq('id', item.id)
  }

  async function addChecklistItem() {
    const title = newChecklistItem.trim()
    if (!title) return
    setAddingItem(true)
    const nextOrder = checklist.length > 0 ? Math.max(...checklist.map(i => i.sequence_order)) + 1 : 0
    const { data, error } = await supabase
      .from('task_checklist_items')
      .insert({ task_id: task.id, title, sequence_order: nextOrder })
      .select()
      .single()
    if (!error && data) {
      setChecklist(prev => [...prev, data])
      setNewChecklistItem('')
    }
    setAddingItem(false)
  }

  async function deleteChecklistItem(id: string) {
    setChecklist(prev => prev.filter(i => i.id !== id))
    await supabase.from('task_checklist_items').delete().eq('id', id)
  }

  // ── Time Tracking ────────────────────────────────────────
  async function startTimer() {
    const res = await fetch(`/api/taskflow/${task.id}/time`, { method: 'POST' })
    if (res.ok) {
      setTimerRunning(true)
      setElapsedSeconds(0)
      loadTimeEntries()
    } else {
      const { error } = await res.json()
      toast.error(error || 'Failed to start timer')
    }
  }

  async function stopTimer() {
    const res = await fetch(`/api/taskflow/${task.id}/time`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: timerNotes }),
    })
    if (res.ok) {
      setTimerRunning(false)
      setElapsedSeconds(0)
      setTimerNotes('')
      loadTimeEntries()
    }
  }

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function formatDuration(minutes: number | null) {
    if (!minutes) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const totalLoggedMinutes = timeEntries
    .filter(e => e.ended_at && e.duration_minutes)
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0)

  // ── Comments ─────────────────────────────────────────────
  async function submitComment() {
    const text = newComment.trim()
    if (!text) return
    setSubmittingComment(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: task.id, comment: text, user_id: user?.id })
      .select()
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data])
      setNewComment('')
    }
    setSubmittingComment(false)
  }

  // ── Status Change ─────────────────────────────────────────
  async function handleStatusChange(newStatus: string) {
    setSavingStatus(true)
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)
    if (!error) {
      setCurrentStatus(newStatus)
      onStatusChange?.(task.id, newStatus)
    }
    setSavingStatus(false)
  }

  const completedCount = checklist.filter(i => i.is_completed).length
  const checklistProgress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${task.priority ? PRIORITY_COLORS[task.priority] : 'bg-gray-100 text-gray-600'}`}>
                {task.priority?.toUpperCase()}
              </span>
              {task.trade && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                  {task.trade}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{task.title}</h2>
            {task.assignee && (
              <p className="text-sm text-gray-500 mt-0.5">👷 {task.assignee}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Status + key stats */}
        <div className="px-5 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-0.5">Status</label>
            <select
              value={currentStatus}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={savingStatus}
              className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {task.dueDate && (
            <div>
              <span className="text-xs text-gray-500 block mb-0.5">Due</span>
              <span className="text-sm font-medium text-gray-800">
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
          {(task.estimatedHours || task.actualHours) && (
            <div>
              <span className="text-xs text-gray-500 block mb-0.5">Hours</span>
              <span className="text-sm font-medium text-gray-800">
                {task.actualHours || 0}h / {task.estimatedHours || '?'}h
              </span>
            </div>
          )}
          {task.description && (
            <p className="w-full text-sm text-gray-600 pt-1">{task.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {([
            { id: 'checklist', label: 'Checklist', icon: <ListBulletIcon className="h-4 w-4" /> },
            { id: 'time', label: 'Time', icon: <ClockIcon className="h-4 w-4" /> },
            { id: 'comments', label: 'Comments', icon: <ChatBubbleLeftIcon className="h-4 w-4" /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 flex-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'checklist' && checklist.length > 0 && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {completedCount}/{checklist.length}
                </span>
              )}
              {tab.id === 'comments' && comments.length > 0 && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {comments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── CHECKLIST TAB ── */}
          {activeTab === 'checklist' && (
            <div>
              {checklist.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{completedCount} of {checklist.length} complete</span>
                    <span>{checklistProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-3 group p-2 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={item.is_completed}
                      onChange={() => toggleChecklistItem(item)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {item.title}
                    </span>
                    <button
                      onClick={() => deleteChecklistItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                  placeholder="Add checklist item..."
                  className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addChecklistItem}
                  disabled={!newChecklistItem.trim() || addingItem}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {checklist.length === 0 && (
                <p className="text-sm text-gray-400 text-center mt-8">
                  No checklist items yet. Add sub-tasks above.
                </p>
              )}
            </div>
          )}

          {/* ── TIME TRACKING TAB ── */}
          {activeTab === 'time' && (
            <div>
              {/* Timer */}
              <div className={`rounded-xl p-5 mb-5 text-center ${timerRunning ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border'}`}>
                <div className={`text-4xl font-mono font-bold mb-3 ${timerRunning ? 'text-green-600' : 'text-gray-700'}`}>
                  {formatElapsed(elapsedSeconds)}
                </div>
                {timerRunning && (
                  <input
                    type="text"
                    value={timerNotes}
                    onChange={e => setTimerNotes(e.target.value)}
                    placeholder="Notes (optional)..."
                    className="w-full text-sm border rounded px-3 py-1.5 mb-3 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                )}
                <button
                  onClick={timerRunning ? stopTimer : startTimer}
                  className={`px-6 py-2 rounded-lg font-semibold text-sm ${
                    timerRunning
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {timerRunning ? '⏹ Stop Timer' : '▶ Start Timer'}
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {formatDuration(totalLoggedMinutes)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Total logged</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {task.estimatedHours ? `${task.estimatedHours}h` : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Estimated</div>
                </div>
              </div>

              {/* Entry list */}
              {timeEntries.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sessions</h4>
                  {timeEntries.filter(e => e.ended_at).map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <div className="font-medium text-gray-800">
                          {new Date(entry.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' '}
                          {new Date(entry.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {entry.notes && <div className="text-xs text-gray-500 mt-0.5">{entry.notes}</div>}
                      </div>
                      <span className="font-semibold text-gray-700">{formatDuration(entry.duration_minutes)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center mt-8">
                  No time logged yet. Start the timer to track work.
                </p>
              )}
            </div>
          )}

          {/* ── COMMENTS TAB ── */}
          {activeTab === 'comments' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-4 mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center mt-8">
                    No comments yet. Start the conversation.
                  </p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                        {c.user_id.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800">
                          {c.comment}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 ml-1">
                          {new Date(c.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment input */}
              <div className="flex gap-2 pt-2 border-t">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                  placeholder="Add a comment..."
                  className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
