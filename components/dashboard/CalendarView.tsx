"use client"

import { useState, useMemo, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import enUS from 'date-fns/locale/en-US'

type Task = {
  id: string
  title: string
  status: string
  trade: "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general"
  priority: "critical" | "high" | "medium" | "low"
  dueDate: string
  startDate: string
  weatherDependent: boolean
  inspectionRequired: boolean
  progress: number
  assignee: string
  project: string
}

interface CalendarViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onDateClick?: (date: Date) => void
}

const locales = {
  'en-US': enUS
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const tradeColors = {
  electrical: '#FFD93D',
  plumbing: '#6A9BFD',
  hvac: '#38BDF8',
  concrete: '#4A4A4A',
  framing: '#D97706',
  finishing: '#E0E0E0',
  general: '#4ECDC4'
}

export default function CalendarView({ tasks, onTaskClick, onDateClick }: CalendarViewProps) {
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Log current calendar view
  console.log('Calendar currently showing:', format(date, 'MMMM yyyy'), '(view:', view, ')')

  // Convert tasks to calendar events
  const events = useMemo(() => {
    console.log('CalendarView converting tasks to events:', tasks.length, 'tasks')

    const validEvents = tasks
      .filter(task => {
        const hasValidDueDate = task.dueDate && task.dueDate.trim() !== ''
        if (!hasValidDueDate) {
          console.warn('Task missing valid dueDate:', task.title, task.dueDate)
        }
        return hasValidDueDate
      })
      .map(task => {
        const startDate = (task.startDate && task.startDate.trim() !== '') ? task.startDate : task.dueDate
        const event = {
          id: task.id,
          title: task.title,
          start: new Date(startDate),
          end: new Date(task.dueDate),
          resource: task,
          allDay: false
        }

        // Validate dates
        if (isNaN(event.start.getTime()) || isNaN(event.end.getTime())) {
          console.error('Invalid date for task:', task.title, 'start:', startDate, 'end:', task.dueDate)
          return null
        }

        console.log('Created calendar event:', event.title, 'from', event.start, 'to', event.end)
        return event
      })
      .filter(event => event !== null)

    console.log('Total valid calendar events:', validEvents.length)

    // Log events by month for debugging
    const eventsByMonth: { [key: string]: number } = {}
    validEvents.forEach(event => {
      const monthKey = format(event.start, 'MMMM yyyy')
      eventsByMonth[monthKey] = (eventsByMonth[monthKey] || 0) + 1
    })
    console.log('Events by month:', eventsByMonth)

    return validEvents
  }, [tasks])

  // Custom event style
  const eventStyleGetter = useCallback((event: any) => {
    const task = event.resource as Task
    const backgroundColor = tradeColors[task.trade] || '#4ECDC4'

    let borderLeftColor = '#1A1A1A'
    if (task.priority === 'critical') borderLeftColor = '#DC2626'
    else if (task.priority === 'high') borderLeftColor = '#F59E0B'
    else if (task.priority === 'medium') borderLeftColor = '#FFD93D'
    else if (task.priority === 'low') borderLeftColor = '#6BCB77'

    return {
      style: {
        backgroundColor,
        borderLeft: `4px solid ${borderLeftColor}`,
        color: '#1A1A1A',
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '13px',
        fontWeight: '600',
        opacity: task.status === 'completed' ? 0.6 : 1,
        border: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }
    }
  }, [])

  // Custom event component
  const EventComponent = ({ event }: any) => {
    const task = event.resource as Task
    return (
      <div className="flex items-center justify-between gap-1 h-full">
        <span className="truncate flex-1">{event.title}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {task.weatherDependent && <span className="text-xs">🌤️</span>}
          {task.inspectionRequired && <span className="text-xs">🔍</span>}
        </div>
      </div>
    )
  }

  // Custom date cell wrapper to show weather overlay
  const DateCellWrapper = ({ children, value }: any) => {
    const dateString = format(value, 'yyyy-MM-dd')
    const dayTasks = tasks.filter(t => t.dueDate === dateString)
    const hasWeatherTask = dayTasks.some(t => t.weatherDependent)
    const hasInspection = dayTasks.some(t => t.inspectionRequired)

    return (
      <div className="relative h-full">
        {children}
        {hasWeatherTask && (
          <div className="absolute top-1 right-1 text-xs opacity-50">🌤️</div>
        )}
        {hasInspection && (
          <div className="absolute top-1 right-6 text-xs opacity-50">🔍</div>
        )}
      </div>
    )
  }

  const handleSelectEvent = useCallback((event: any) => {
    const task = event.resource as Task
    setSelectedTask(task)
    if (onTaskClick) {
      onTaskClick(task)
    }
  }, [onTaskClick])

  const handleSelectSlot = useCallback(({ start }: any) => {
    if (onDateClick) {
      onDateClick(start)
    }
  }, [onDateClick])

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(new Date())}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF', boxShadow: '0 2px 4px rgba(255,107,107,0.2)' }}
          >
            Today
          </button>
          <button
            onClick={() => {
              const newDate = new Date(date)
              if (view === 'month') newDate.setMonth(date.getMonth() - 1)
              else if (view === 'week') newDate.setDate(date.getDate() - 7)
              else newDate.setDate(date.getDate() - 1)
              setDate(newDate)
            }}
            className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-gray-100"
            style={{ border: '1px solid #E0E0E0', color: '#1A1A1A' }}
          >
            ←
          </button>
          <button
            onClick={() => {
              const newDate = new Date(date)
              if (view === 'month') newDate.setMonth(date.getMonth() + 1)
              else if (view === 'week') newDate.setDate(date.getDate() + 7)
              else newDate.setDate(date.getDate() + 1)
              setDate(newDate)
            }}
            className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-gray-100"
            style={{ border: '1px solid #E0E0E0', color: '#1A1A1A' }}
          >
            →
          </button>
          <h3 className="text-lg font-bold ml-2" style={{ color: '#1A1A1A' }}>
            {format(date, 'MMMM yyyy')}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === 'month' ? '' : 'hover:bg-gray-100'}`}
            style={view === 'month' ? { backgroundColor: '#FF6B6B', color: '#FFFFFF' } : { border: '1px solid #E0E0E0', color: '#4A4A4A' }}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === 'week' ? '' : 'hover:bg-gray-100'}`}
            style={view === 'week' ? { backgroundColor: '#FF6B6B', color: '#FFFFFF' } : { border: '1px solid #E0E0E0', color: '#4A4A4A' }}
          >
            Week
          </button>
          <button
            onClick={() => setView('day')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === 'day' ? '' : 'hover:bg-gray-100'}`}
            style={view === 'day' ? { backgroundColor: '#FF6B6B', color: '#FFFFFF' } : { border: '1px solid #E0E0E0', color: '#4A4A4A' }}
          >
            Day
          </button>
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
        <span style={{ color: '#4A4A4A' }}>•</span>
        <span style={{ color: '#4A4A4A' }}>🌤️ Weather Dependent</span>
        <span style={{ color: '#4A4A4A' }}>🔍 Inspection Required</span>
      </div>

      {/* Calendar */}
      <div className="flex-1 rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', height: '700px' }}>
        {console.log(`🗓️ Rendering Calendar: ${events.length} events, view=${view}, date=${format(date, 'yyyy-MM-dd')}`)}
        {events.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded m-4">
            ⚠️ No events to display. Check console for details.
          </div>
        )}
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '700px' }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          components={{
            event: EventComponent,
            dateCellWrapper: DateCellWrapper
          }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          popup
        />
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2" style={{ color: '#1A1A1A' }}>
                  {selectedTask.title}
                </h3>
                <p className="text-sm mb-2" style={{ color: '#4A4A4A' }}>{selectedTask.project}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: tradeColors[selectedTask.trade], color: '#1A1A1A' }}
                  >
                    {selectedTask.trade}
                  </span>
                  <span className="text-xs" style={{ color: '#4A4A4A' }}>
                    Due: {new Date(selectedTask.dueDate).toLocaleDateString()}
                  </span>
                  {selectedTask.weatherDependent && <span className="text-sm">🌤️</span>}
                  {selectedTask.inspectionRequired && <span className="text-sm">🔍</span>}
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-2xl font-bold hover:opacity-70 transition-opacity"
                style={{ color: '#4A4A4A' }}
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#4A4A4A' }}>Assigned to:</p>
                <p className="text-sm" style={{ color: '#1A1A1A' }}>{selectedTask.assignee}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#4A4A4A' }}>Progress:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-full h-2" style={{ backgroundColor: '#E0E0E0' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${selectedTask.progress}%`, backgroundColor: tradeColors[selectedTask.trade] }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{selectedTask.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
