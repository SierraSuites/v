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
          tasks.map((task) => (
            <div
              key={task.id}
              className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{task.projects?.name || 'No project'}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
              </div>
              <div className="mt-2 flex items-center text-xs text-gray-600">
                <span>📅 {task.due_date}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
