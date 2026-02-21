'use client'

import Link from 'next/link'

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

// Spec line 235: Priority icons
function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'critical':
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
      )
    case 'high':
      return (
        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    case 'medium':
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      )
    default:
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      )
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800'
    case 'high':
      return 'bg-orange-100 text-orange-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'low':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
        <Link
          href="/taskflow"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All →
        </Link>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm mb-2">No upcoming tasks</p>
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
