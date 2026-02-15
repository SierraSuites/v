'use client'

import Link from 'next/link'
import { useThemeColors } from '@/lib/hooks/useThemeColors'


interface Task {
  id: string
  title: string
  due_date: string
  priority: string
  status: string
  project_id: string
  projects?: {
    name: string
  }
}

interface UpcomingTasksProps {
  tasks: Task[]
}

export default function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-orange-100 text-orange-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  const { colors, darkMode } = useThemeColors()

// Spec line 238: Due time formatting - "Today", "Tomorrow", or date
function formatDueDate(dateString: string) {
  const date = new Date(dateString + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (date < today) return 'Overdue'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Spec line 865 + Quality line 795: Check if task is overdue
function isOverdue(dateString: string, status: string) {
  if (status === 'completed') return false
  const date = new Date(dateString + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export default function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  return (
    <div className=" rounded-lg shadow p-6" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Upcoming Tasks</h2>
        <Link
          href="/taskflow"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All →
        </Link>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8" style={{ color: colors.textMuted }}>
            <p className="mb-2">No upcoming tasks</p>
            <Link
              href="/taskflow"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Create a task →
            </Link>
          </div>
        ) : (
          tasks.map((task) => {
            const overdue = isOverdue(task.due_date, task.status)
            return (
              <div
                key={task.id}
                className={`border rounded-lg p-3 transition-colors ${
                  overdue
                    ? 'border-red-300 bg-red-50 hover:border-red-400'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Spec line 235: Priority icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getPriorityIcon(task.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${overdue ? 'text-red-900' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{task.projects?.name || 'No project'}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  {/* Spec line 238: Due date formatting */}
                  <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDueDate(task.due_date)}
                  </span>
                  {/* Spec line 240: Status badge */}
                  <span className="text-gray-400 capitalize">{task.status.replace('_', ' ')}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
