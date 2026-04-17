'use client'

import Link from 'next/link'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface Task {
  id: string
  title: string
  due_date: string
  priority: string
  status: string
  progress: number
  trade?: string | null
  project_id: string
  projects?: {
    name: string
  }
}

interface UpcomingTasksProps {
  tasks: Task[]
}

const TRADE_COLORS: Record<string, { light: string; dark: string; border: string }> = {
  electrical: { light: '#FFF9E6', dark: 'rgba(255,217,61,0.15)', border: '#FFD93D' },
  plumbing:   { light: '#E5F4FF', dark: 'rgba(106,155,253,0.15)', border: '#6A9BFD' },
  hvac:       { light: '#F0F9FF', dark: 'rgba(56,189,248,0.15)',  border: '#38BDF8' },
  concrete:   { light: '#F3F4F6', dark: 'rgba(107,114,128,0.15)', border: '#6B7280' },
  carpentry:  { light: '#FFF5EB', dark: 'rgba(217,119,6,0.15)',   border: '#D97706' },
  framing:    { light: '#FFF5EB', dark: 'rgba(217,119,6,0.15)',   border: '#D97706' },
  masonry:    { light: '#F3F4F6', dark: 'rgba(107,114,128,0.15)', border: '#6B7280' },
  roofing:    { light: '#EFF6FF', dark: 'rgba(59,130,246,0.15)',  border: '#3B82F6' },
  finishing:  { light: '#F9FAFB', dark: 'rgba(156,163,175,0.15)', border: '#9CA3AF' },
  general:    { light: '#F9FAFB', dark: 'rgba(156,163,175,0.15)', border: '#9CA3AF' },
}

const PRIORITY_CONFIG: Record<string, { color: string; label: string; barColor: string }> = {
  urgent:   { color: '#DC2626', label: 'Urgent',  barColor: '#DC2626' },
  high:     { color: '#F59E0B', label: 'High',    barColor: '#F59E0B' },
  medium:   { color: '#3B82F6', label: 'Medium',  barColor: '#3B82F6' },
  low:      { color: '#6B7280', label: 'Low',     barColor: '#6B7280' },
}

const STATUS_LABEL: Record<string, string> = {
  'todo':         'To Do',
  'in-progress':  'In Progress',
  'blocked':      'Blocked',
  'under-review': 'Under Review',
  'pending':      'Pending',
}

function formatDueDate(dateString: string) {
  const date = new Date(dateString + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (date < today) {
    const diffDays = Math.ceil((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    return `${diffDays}d overdue`
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dateString: string, status: string) {
  if (status === 'completed') return false
  const date = new Date(dateString + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export default function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  const { colors, darkMode } = useThemeColors()

  const overdueTasks = tasks.filter(t => isOverdue(t.due_date, t.status))
  const upcomingTasks = tasks.filter(t => !isOverdue(t.due_date, t.status))

  const renderTask = (task: Task) => {
    const overdue = isOverdue(task.due_date, task.status)
    const blocked = task.status === 'blocked'
    const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
    const trade = task.trade ? TRADE_COLORS[task.trade] ?? TRADE_COLORS.general : null
    const progress = task.progress ?? 0

    const cardBg = overdue
      ? (darkMode ? 'rgba(220,38,38,0.08)' : '#FFF5F5')
      : colors.bgAlt
    // Store border color separately so we can apply each side individually.
    // Mixing `border` shorthand and `borderLeft` in the same style object causes
    // a React rerender warning when switching themes.
    const borderColor = overdue
      ? (darkMode ? 'rgba(220,38,38,0.35)' : '#FCA5A5')
      : (darkMode ? '#2d3548' : '#E0E0E0')
    const accentColor = blocked
      ? '#DC2626'
      : trade ? trade.border : priority.color
    const tradeBg = trade
      ? (darkMode ? trade.dark : trade.light)
      : (darkMode ? 'rgba(107,114,128,0.15)' : '#F3F4F6')

    return (
      <div
        key={task.id}
        className="rounded-lg p-3 transition-colors"
        style={{
          backgroundColor: cardBg,
          borderTop: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        {/* Header row */}
        <div className="flex items-start gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: overdue ? '#DC2626' : colors.text }}>
              {task.title}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: colors.textMuted }}>
              {task.projects?.name || 'No project'}
            </p>
          </div>
          {/* Priority badge */}
          <span
            className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: darkMode ? `${priority.color}22` : `${priority.color}18`,
              color: priority.color,
            }}
          >
            {priority.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div
            className="w-full rounded-full h-1"
            style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}
          >
            <div
              className="h-1 rounded-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: blocked ? '#DC2626' : priority.barColor,
              }}
            />
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Due date */}
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: overdue ? '#DC2626' : colors.textMuted, fontWeight: overdue ? 600 : 400 }}
          >
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDueDate(task.due_date)}
          </span>

          {/* Status badge */}
          <span className="text-xs capitalize" style={{ color: colors.textMuted }}>
            {blocked && <span style={{ color: '#DC2626' }}>Blocked · </span>}
            {STATUS_LABEL[task.status] ?? task.status.replace(/-|_/g, ' ')}
          </span>

          {/* Trade badge */}
          {task.trade && (
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded capitalize"
              style={{ backgroundColor: tradeBg, color: colors.textMuted }}
            >
              {task.trade}
            </span>
          )}

          {/* Progress % */}
          {progress > 0 && (
            <span
              className="text-xs font-semibold"
              style={{ color: blocked ? '#DC2626' : priority.color, marginLeft: task.trade ? undefined : 'auto' }}
            >
              {progress}%
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg shadow p-6"
      style={{
        backgroundColor: colors.bg,
        border: colors.border,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Upcoming Tasks</h2>
        <Link href="/taskflow" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All →
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8" style={{ color: colors.textMuted }}>
          <p className="mb-2">No upcoming tasks</p>
          <Link href="/taskflow" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Create a task →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {overdueTasks.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#DC2626' }}>
                Overdue ({overdueTasks.length})
              </p>
              {overdueTasks.map(renderTask)}
              {upcomingTasks.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-wide mt-3 mb-1" style={{ color: colors.textMuted }}>
                  Upcoming
                </p>
              )}
            </>
          )}
          {upcomingTasks.map(renderTask)}
        </div>
      )}
    </div>
  )
}
