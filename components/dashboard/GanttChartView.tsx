"use client"

import { useEffect, useRef, useState } from 'react'
import Gantt from 'frappe-gantt'

type Task = {
  id: string
  title: string
  status: string
  trade: "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general"
  priority: "critical" | "high" | "medium" | "low"
  dueDate: string
  startDate: string
  duration: number
  dependencies: string[]
  progress: number
  assignee: string
  project: string
  weatherDependent: boolean
  inspectionRequired: boolean
}

interface GanttChartViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

const tradeColors = {
  electrical: '#FFD93D',
  plumbing: '#6A9BFD',
  hvac: '#38BDF8',
  concrete: '#4A4A4A',
  framing: '#D97706',
  finishing: '#E0E0E0',
  general: '#4ECDC4'
}

const priorityColors = {
  critical: '#DC2626',
  high: '#F59E0B',
  medium: '#FFD93D',
  low: '#6BCB77'
}

export default function GanttChartView({ tasks, onTaskClick }: GanttChartViewProps) {
  const ganttRef = useRef<HTMLDivElement>(null)
  const ganttInstance = useRef<any>(null)
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week')
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Calculate critical path (simple implementation based on dependencies)
  const calculateCriticalPath = () => {
    const criticalTasks = new Set<string>()

    // Find tasks with dependencies
    tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        criticalTasks.add(task.id)
        task.dependencies.forEach(depId => criticalTasks.add(depId))
      }
    })

    // Also include critical priority tasks
    tasks.forEach(task => {
      if (task.priority === 'critical') {
        criticalTasks.add(task.id)
      }
    })

    return criticalTasks
  }

  const criticalPath = calculateCriticalPath()

  useEffect(() => {
    if (!ganttRef.current || tasks.length === 0) return

    // Convert tasks to Gantt format
    const ganttTasks = tasks.map(task => {
      const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate)
      start.setDate(start.getDate() - (task.duration || 1))

      const isCritical = criticalPath.has(task.id)

      return {
        id: task.id,
        name: task.title,
        start: start.toISOString().split('T')[0],
        end: task.dueDate,
        progress: task.progress,
        dependencies: task.dependencies.join(','),
        custom_class: isCritical && showCriticalPath ? 'critical-task' : task.trade,
      }
    })

    // Clear previous instance
    if (ganttInstance.current) {
      ganttRef.current.innerHTML = ''
    }

    try {
      // Create new Gantt instance
      ganttInstance.current = new Gantt(ganttRef.current, ganttTasks, {
        view_mode: viewMode,
        bar_height: 30,
        bar_corner_radius: 6,
        arrow_curve: 5,
        padding: 18,
        date_format: 'YYYY-MM-DD',
        language: 'en',
        custom_popup_html: (task: any) => {
          const originalTask = tasks.find(t => t.id === task.id)
          if (!originalTask) return ''

          return `
            <div class="gantt-popup" style="padding: 12px; min-width: 250px;">
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 14px; color: #1A1A1A;">${task.name}</strong>
              </div>
              <div style="margin-bottom: 6px;">
                <span style="font-size: 12px; color: #4A4A4A;">Project: ${originalTask.project}</span>
              </div>
              <div style="margin-bottom: 6px;">
                <span style="font-size: 12px; color: #4A4A4A;">Assigned: ${originalTask.assignee}</span>
              </div>
              <div style="margin-bottom: 6px;">
                <span style="font-size: 12px; color: #4A4A4A;">Trade: ${originalTask.trade}</span>
              </div>
              <div style="margin-bottom: 6px;">
                <span style="font-size: 12px; color: #4A4A4A;">Priority: ${originalTask.priority}</span>
              </div>
              <div style="margin-bottom: 6px;">
                <span style="font-size: 12px; color: #4A4A4A;">Duration: ${task._end.diff(task._start, 'day')} days</span>
              </div>
              <div style="margin-bottom: 6px;">
                <span style="font-size: 12px; color: #4A4A4A;">Progress: ${task.progress}%</span>
              </div>
              ${originalTask.weatherDependent ? '<div style="font-size: 12px; color: #4A4A4A;">🌤️ Weather Dependent</div>' : ''}
              ${originalTask.inspectionRequired ? '<div style="font-size: 12px; color: #4A4A4A;">🔍 Inspection Required</div>' : ''}
            </div>
          `
        },
        on_click: (task: any) => {
          const originalTask = tasks.find(t => t.id === task.id)
          if (originalTask) {
            setSelectedTask(originalTask)
            if (onTaskClick) {
              onTaskClick(originalTask)
            }
          }
        },
      })

      // Add custom styles for different trades
      const styleElement = document.createElement('style')
      styleElement.innerHTML = `
        .gantt .bar-wrapper .bar.electrical { fill: ${tradeColors.electrical}; }
        .gantt .bar-wrapper .bar.plumbing { fill: ${tradeColors.plumbing}; }
        .gantt .bar-wrapper .bar.hvac { fill: ${tradeColors.hvac}; }
        .gantt .bar-wrapper .bar.concrete { fill: ${tradeColors.concrete}; }
        .gantt .bar-wrapper .bar.framing { fill: ${tradeColors.framing}; }
        .gantt .bar-wrapper .bar.finishing { fill: ${tradeColors.finishing}; }
        .gantt .bar-wrapper .bar.general { fill: ${tradeColors.general}; }
        .gantt .bar-wrapper .bar.critical-task { fill: ${priorityColors.critical}; stroke: #991B1B; stroke-width: 2; }
        .gantt .bar-wrapper .bar:hover { opacity: 0.8; }
        .gantt-popup {
          background: #FFFFFF;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border: 1px solid #E0E0E0;
        }
      `
      document.head.appendChild(styleElement)

      return () => {
        document.head.removeChild(styleElement)
      }
    } catch (error) {
      console.error('Error creating Gantt chart:', error)
    }
  }, [tasks, viewMode, showCriticalPath, onTaskClick])

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('Day')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'Day' ? '' : 'hover:bg-gray-100'}`}
            style={viewMode === 'Day' ? { backgroundColor: '#FF6B6B', color: '#FFFFFF' } : { border: '1px solid #E0E0E0', color: '#4A4A4A' }}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('Week')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'Week' ? '' : 'hover:bg-gray-100'}`}
            style={viewMode === 'Week' ? { backgroundColor: '#FF6B6B', color: '#FFFFFF' } : { border: '1px solid #E0E0E0', color: '#4A4A4A' }}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('Month')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'Month' ? '' : 'hover:bg-gray-100'}`}
            style={viewMode === 'Month' ? { backgroundColor: '#FF6B6B', color: '#FFFFFF' } : { border: '1px solid #E0E0E0', color: '#4A4A4A' }}
          >
            Month
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#FF6B6B' }}
            />
            <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Show Critical Path</span>
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FFD93D' }}></div>
          <span style={{ color: '#4A4A4A' }}>Electrical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6A9BFD' }}></div>
          <span style={{ color: '#4A4A4A' }}>Plumbing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#38BDF8' }}></div>
          <span style={{ color: '#4A4A4A' }}>HVAC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4A4A4A' }}></div>
          <span style={{ color: '#4A4A4A' }}>Concrete</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#D97706' }}></div>
          <span style={{ color: '#4A4A4A' }}>Framing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DC2626', border: '2px solid #991B1B' }}></div>
          <span style={{ color: '#4A4A4A' }}>Critical Path</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg p-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#4A4A4A' }}>Total Tasks</p>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{tasks.length}</p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#4A4A4A' }}>Critical Path Tasks</p>
          <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{criticalPath.size}</p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#4A4A4A' }}>With Dependencies</p>
          <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
            {tasks.filter(t => t.dependencies && t.dependencies.length > 0).length}
          </p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#4A4A4A' }}>Avg Progress</p>
          <p className="text-2xl font-bold" style={{ color: '#6BCB77' }}>
            {tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0}%
          </p>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 rounded-xl overflow-auto p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', minHeight: '500px' }}>
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="text-6xl mb-4 block">📊</span>
              <p className="text-lg font-semibold mb-2" style={{ color: '#1A1A1A' }}>No tasks to display</p>
              <p className="text-sm" style={{ color: '#4A4A4A' }}>Create tasks to see them in the Gantt chart</p>
            </div>
          </div>
        ) : (
          <div ref={ganttRef}></div>
        )}
      </div>

      {/* Task Dependencies List */}
      {tasks.filter(t => t.dependencies && t.dependencies.length > 0).length > 0 && (
        <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Task Dependencies</h3>
          <div className="space-y-2">
            {tasks
              .filter(t => t.dependencies && t.dependencies.length > 0)
              .map(task => (
                <div key={task.id} className="flex items-start gap-2 text-xs">
                  <span className="font-semibold" style={{ color: '#1A1A1A' }}>{task.title}</span>
                  <span style={{ color: '#4A4A4A' }}>depends on:</span>
                  <span style={{ color: '#FF6B6B' }}>
                    {task.dependencies.map(depId => {
                      const depTask = tasks.find(t => t.id === depId)
                      return depTask ? depTask.title : depId
                    }).join(', ')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
