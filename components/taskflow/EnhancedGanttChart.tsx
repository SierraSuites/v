'use client'

// ============================================================================
// ENHANCED GANTT CHART WITH DEPENDENCIES
// Professional Gantt chart showing task timeline and dependencies
// ============================================================================

import { useState, useMemo } from 'react'
import { format, addDays, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend } from 'date-fns'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface Task {
  id: string
  title: string
  start_date: string
  end_date: string
  progress: number
  assignee?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies?: string[] // Array of task IDs this task depends on
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
}

interface EnhancedGanttChartProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
}

type ViewMode = 'day' | 'week' | 'month'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EnhancedGanttChart({
  tasks,
  onTaskClick,
  onTaskUpdate
}: EnhancedGanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showWeekends, setShowWeekends] = useState(false)
  const [highlightedDependencies, setHighlightedDependencies] = useState<string[]>([])

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  // Calculate date range based on tasks
  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date()
      return {
        start: startOfWeek(today),
        end: endOfWeek(addDays(today, 30))
      }
    }

    const dates = tasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)])
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    return {
      start: startOfWeek(addDays(minDate, -7)),
      end: endOfWeek(addDays(maxDate, 7))
    }
  }, [tasks])

  // Generate timeline columns
  const timelineColumns = useMemo(() => {
    const columns = eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end
    })

    if (!showWeekends) {
      return columns.filter(date => !isWeekend(date))
    }

    return columns
  }, [dateRange, showWeekends])

  // Calculate task positions
  const getTaskPosition = (task: Task) => {
    const taskStart = new Date(task.start_date)
    const taskEnd = new Date(task.end_date)

    const startOffset = differenceInDays(taskStart, dateRange.start)
    const duration = differenceInDays(taskEnd, taskStart) + 1

    const totalDays = timelineColumns.length
    const columnWidth = 100 / totalDays

    return {
      left: `${startOffset * columnWidth}%`,
      width: `${duration * columnWidth}%`
    }
  }

  // Get task dependencies
  const getTaskDependencies = (taskId: string): Task[] => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !task.dependencies) return []

    return task.dependencies
      .map(depId => tasks.find(t => t.id === depId))
      .filter(Boolean) as Task[]
  }

  // Check if task is blocked by dependencies
  const isTaskBlocked = (task: Task): boolean => {
    if (!task.dependencies || task.dependencies.length === 0) return false

    const deps = getTaskDependencies(task.id)
    return deps.some(dep => dep.status !== 'completed')
  }

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-gray-400'
      default: return 'bg-blue-500'
    }
  }

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600'
      case 'in_progress': return 'bg-blue-600'
      case 'blocked': return 'bg-red-600'
      default: return 'bg-gray-400'
    }
  }

  // Highlight dependencies
  const handleTaskHover = (taskId: string | null) => {
    if (taskId) {
      const task = tasks.find(t => t.id === taskId)
      if (task && task.dependencies) {
        setHighlightedDependencies([taskId, ...task.dependencies])
      }
    } else {
      setHighlightedDependencies([])
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Gantt Chart</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{tasks.length} tasks</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors capitalize ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Show Weekends Toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showWeekends}
              onChange={(e) => setShowWeekends(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show Weekends</span>
          </label>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4 text-gray-600" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 border-l pl-3">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Timeline Header */}
          <div className="flex border-b bg-gray-100 sticky top-0 z-10">
            {/* Task Name Column */}
            <div className="w-64 flex-shrink-0 p-3 border-r font-semibold text-gray-700 text-sm">
              Task Name
            </div>

            {/* Timeline Columns */}
            <div className="flex-1 flex">
              {timelineColumns.map((date, index) => {
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                const isWeekendDay = isWeekend(date)

                return (
                  <div
                    key={index}
                    className={`flex-1 p-2 border-r text-center text-xs ${
                      isToday ? 'bg-blue-100 font-semibold text-blue-900' :
                      isWeekendDay ? 'bg-gray-200 text-gray-600' :
                      'text-gray-600'
                    }`}
                    style={{ minWidth: '40px' }}
                  >
                    <div>{format(date, 'EEE')}</div>
                    <div className="font-semibold">{format(date, 'd')}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div className="relative">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No tasks to display</p>
                <p className="text-sm mt-2">Add tasks with start and end dates to see them in the Gantt chart</p>
              </div>
            ) : (
              tasks.map((task, taskIndex) => {
                const position = getTaskPosition(task)
                const isBlocked = isTaskBlocked(task)
                const isHighlighted = highlightedDependencies.includes(task.id)

                return (
                  <div
                    key={task.id}
                    className={`flex border-b hover:bg-gray-50 transition-colors ${
                      isHighlighted ? 'bg-blue-50' : ''
                    }`}
                    onMouseEnter={() => handleTaskHover(task.id)}
                    onMouseLeave={() => handleTaskHover(null)}
                  >
                    {/* Task Name */}
                    <div className="w-64 flex-shrink-0 p-3 border-r">
                      <div className="flex items-center gap-2">
                        {/* Status Indicator */}
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {task.title}
                          </div>
                          {task.assignee && (
                            <div className="text-xs text-gray-500 truncate">
                              {task.assignee}
                            </div>
                          )}
                        </div>

                        {/* Priority Badge */}
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                      </div>

                      {/* Dependencies Indicator */}
                      {task.dependencies && task.dependencies.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Depends on {task.dependencies.length} task{task.dependencies.length > 1 ? 's' : ''}
                        </div>
                      )}

                      {isBlocked && (
                        <div className="mt-1 text-xs text-red-600 font-medium">
                          🚫 Blocked
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 relative p-2" style={{ minHeight: '60px' }}>
                      {/* Task Bar */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
                          getStatusColor(task.status)
                        } ${isBlocked ? 'opacity-60' : ''}`}
                        style={position}
                        onClick={() => onTaskClick?.(task)}
                        title={`${task.title}\n${format(new Date(task.start_date), 'MMM d')} - ${format(new Date(task.end_date), 'MMM d')}\nProgress: ${task.progress}%`}
                      >
                        {/* Progress Bar */}
                        <div
                          className="h-full bg-white/30 rounded-lg transition-all"
                          style={{ width: `${task.progress}%` }}
                        />

                        {/* Task Label */}
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-xs font-medium text-white truncate">
                            {task.title} ({task.progress}%)
                          </span>
                        </div>
                      </div>

                      {/* Dependency Lines */}
                      {task.dependencies?.map((depId) => {
                        const depTask = tasks.find(t => t.id === depId)
                        if (!depTask) return null

                        const depIndex = tasks.findIndex(t => t.id === depId)
                        const yOffset = (depIndex - taskIndex) * -60 // Approximate row height

                        return (
                          <svg
                            key={depId}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 0 }}
                          >
                            <line
                              x1="10%"
                              y1={yOffset < 0 ? '0%' : '100%'}
                              x2="10%"
                              y2="50%"
                              stroke="#3B82F6"
                              strokeWidth="2"
                              strokeDasharray="4"
                              opacity="0.5"
                            />
                            <circle
                              cx="10%"
                              cy="50%"
                              r="4"
                              fill="#3B82F6"
                            />
                          </svg>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}

            {/* Today Indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              style={{
                left: `${(differenceInDays(new Date(), dateRange.start) / timelineColumns.length) * 100}%`
              }}
            >
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between p-4 border-t bg-gray-50 text-xs">
        <div className="flex items-center gap-6">
          <div className="font-semibold text-gray-700">Status:</div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span className="text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-600" />
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-600" />
            <span className="text-gray-600">Blocked</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="font-semibold text-gray-700">Priority:</div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-gray-600">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-600">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-600" />
            <span className="text-gray-600">Critical</span>
          </div>
        </div>
      </div>
    </div>
  )
}
