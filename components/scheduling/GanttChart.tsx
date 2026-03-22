'use client'

/**
 * Gantt Chart Component
 * Visual timeline for project tasks with dependencies
 */

import { useMemo } from 'react'
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'

interface Task {
  id: string
  title: string
  start_date: string
  due_date: string
  status: string
  completion_percentage?: number
  assigned_to?: string
  is_milestone?: boolean
  is_on_critical_path?: boolean
  dependencies?: Array<{
    depends_on_task_id: string
    dependency_type: string
  }>
}

interface GanttChartProps {
  tasks: Task[]
  startDate?: Date
  endDate?: Date
  onTaskClick?: (task: Task) => void
  showWeekends?: boolean
  showCriticalPath?: boolean
}

export default function GanttChart({
  tasks,
  startDate: providedStartDate,
  endDate: providedEndDate,
  onTaskClick,
  showWeekends = false,
  showCriticalPath = true,
}: GanttChartProps) {
  // Calculate date range
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date()
      return {
        startDate: today,
        endDate: addDays(today, 30),
        totalDays: 30,
      }
    }

    const taskDates = tasks.flatMap(t => [
      new Date(t.start_date),
      new Date(t.due_date),
    ])

    const minDate = providedStartDate || new Date(Math.min(...taskDates.map(d => d.getTime())))
    const maxDate = providedEndDate || new Date(Math.max(...taskDates.map(d => d.getTime())))

    // Add padding
    const start = startOfWeek(addDays(minDate, -7))
    const end = endOfWeek(addDays(maxDate, 7))

    return {
      startDate: start,
      endDate: end,
      totalDays: differenceInDays(end, start) + 1,
    }
  }, [tasks, providedStartDate, providedEndDate])

  // Generate timeline headers
  const timelineHeaders = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    return days.filter(day => showWeekends || (day.getDay() !== 0 && day.getDay() !== 6))
  }, [startDate, endDate, showWeekends])

  // Calculate task positions
  const taskBars = useMemo(() => {
    return tasks.map(task => {
      const taskStart = new Date(task.start_date)
      const taskEnd = new Date(task.due_date)

      const startOffset = differenceInDays(taskStart, startDate)
      const duration = differenceInDays(taskEnd, taskStart) + 1

      // Filter out weekends if needed
      let adjustedStartOffset = startOffset
      let adjustedDuration = duration

      if (!showWeekends) {
        // Calculate working days only
        const allDays = eachDayOfInterval({ start: startDate, end: taskStart })
        adjustedStartOffset = allDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6).length

        const taskDays = eachDayOfInterval({ start: taskStart, end: taskEnd })
        adjustedDuration = taskDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6).length
      }

      return {
        task,
        left: (adjustedStartOffset / timelineHeaders.length) * 100,
        width: (adjustedDuration / timelineHeaders.length) * 100,
      }
    })
  }, [tasks, startDate, timelineHeaders.length, showWeekends])

  const columnWidth = 40 // pixels
  const rowHeight = 48

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No tasks to display</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-64 flex-shrink-0 px-4 py-3 font-semibold text-sm text-gray-700 border-r border-gray-200">
              Task
            </div>
            <div className="flex-1" style={{ minWidth: `${timelineHeaders.length * columnWidth}px` }}>
              <div className="flex">
                {timelineHeaders.map((date, index) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const isToday = isSameDay(date, new Date())
                  return (
                    <div
                      key={index}
                      className={`flex-shrink-0 px-2 py-1 text-center border-r border-gray-100 ${
                        isWeekend ? 'bg-gray-100' : ''
                      } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
                      style={{ width: `${columnWidth}px` }}
                    >
                      <div className="text-xs font-medium text-gray-600">
                        {format(date, 'EEE')}
                      </div>
                      <div className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                        {format(date, 'd')}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Task Rows */}
          <div className="relative">
            {taskBars.map(({ task, left, width }, index) => {
              const isCriticalPath = showCriticalPath && task.is_on_critical_path
              const isMilestone = task.is_milestone

              return (
                <div
                  key={task.id}
                  className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* Task Name */}
                  <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      {task.assigned_to && (
                        <p className="text-xs text-gray-500 truncate">{task.assigned_to}</p>
                      )}
                    </div>
                    {isCriticalPath && (
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Critical
                      </span>
                    )}
                  </div>

                  {/* Timeline */}
                  <div
                    className="flex-1 relative"
                    style={{ minWidth: `${timelineHeaders.length * columnWidth}px` }}
                  >
                    {/* Today Indicator */}
                    {(() => {
                      const todayOffset = differenceInDays(new Date(), startDate)
                      const adjustedTodayOffset = showWeekends
                        ? todayOffset
                        : eachDayOfInterval({ start: startDate, end: new Date() }).filter(
                            d => d.getDay() !== 0 && d.getDay() !== 6
                          ).length
                      const todayPosition = (adjustedTodayOffset / timelineHeaders.length) * 100
                      if (todayPosition >= 0 && todayPosition <= 100) {
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-blue-500 z-10"
                            style={{ left: `${todayPosition}%` }}
                          />
                        )
                      }
                      return null
                    })()}

                    {/* Task Bar */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded cursor-pointer transition-all hover:shadow-md ${
                        isMilestone
                          ? 'transform rotate-45'
                          : ''
                      }`}
                      style={{
                        left: `${left}%`,
                        width: isMilestone ? '16px' : `${width}%`,
                        minWidth: isMilestone ? '16px' : '20px',
                        backgroundColor: isCriticalPath
                          ? '#DC2626'
                          : task.status === 'completed'
                          ? '#10B981'
                          : task.status === 'in_progress'
                          ? '#3B82F6'
                          : '#9CA3AF',
                      }}
                      onClick={() => onTaskClick?.(task)}
                    >
                      {!isMilestone && task.completion_percentage !== undefined && (
                        <div
                          className="h-full bg-white bg-opacity-30 rounded-l"
                          style={{ width: `${task.completion_percentage}%` }}
                        />
                      )}
                      {!isMilestone && (
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-xs font-medium text-white truncate">
                            {task.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-gray-600">Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-600">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Completed</span>
            </div>
            {showCriticalPath && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-gray-600">Critical Path</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded rotate-45"></div>
              <span className="text-gray-600">Milestone</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-px h-4 bg-blue-500"></div>
              <span className="text-gray-600">Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
