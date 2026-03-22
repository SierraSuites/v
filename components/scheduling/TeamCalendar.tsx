'use client'

/**
 * Team Calendar Component
 * Monthly calendar view showing team member availability and tasks
 */

import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  getDay,
  addDays,
  startOfWeek,
} from 'date-fns'

interface CalendarTask {
  id: string
  title: string
  start_date: string
  due_date: string
  status: string
  assigned_to?: string
  assigned_user_name?: string
  project_name?: string
}

interface TeamCalendarProps {
  tasks: CalendarTask[]
  selectedDate: Date
  onDateClick?: (date: Date) => void
  onTaskClick?: (task: CalendarTask) => void
}

export default function TeamCalendar({
  tasks,
  selectedDate,
  onDateClick,
  onTaskClick,
}: TeamCalendarProps) {
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)

  // Get all days to display (including days from previous/next month to fill the grid)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday
  const calendarEnd = addDays(calendarStart, 41) // 6 weeks * 7 days

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, CalendarTask[]>()

    tasks.forEach((task) => {
      const start = new Date(task.start_date)
      const end = new Date(task.due_date)
      const taskDays = eachDayOfInterval({ start, end })

      taskDays.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd')
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, [])
        }
        grouped.get(dateKey)!.push(task)
      })
    })

    return grouped
  }, [tasks])

  function getTasksForDate(date: Date): CalendarTask[] {
    const dateKey = format(date, 'yyyy-MM-dd')
    return tasksByDate.get(dateKey) || []
  }

  function getTaskColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'in_progress':
        return 'bg-blue-500'
      case 'on_hold':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dayTasks = getTasksForDate(day)
          const isCurrentMonth = isSameMonth(day, selectedDate)
          const isDayToday = isToday(day)
          const isWeekend = getDay(day) === 0 || getDay(day) === 6

          return (
            <div
              key={index}
              className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                isWeekend ? 'bg-gray-50' : 'bg-white'
              } ${!isCurrentMonth ? 'bg-gray-100' : ''} ${
                isDayToday ? 'bg-blue-50' : ''
              } hover:bg-gray-50 transition-colors cursor-pointer`}
              onClick={() => onDateClick?.(day)}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                    isDayToday
                      ? 'bg-blue-600 text-white font-bold'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-xs text-gray-500 font-medium">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className={`text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-shadow ${getTaskColor(
                      task.status
                    )} text-white truncate`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onTaskClick?.(task)
                    }}
                    title={`${task.title}${task.assigned_user_name ? ` - ${task.assigned_user_name}` : ''}`}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium pl-1">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span className="text-gray-600">Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-600">On Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Completed</span>
        </div>
      </div>
    </div>
  )
}
