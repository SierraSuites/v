"use client"

import { useMemo, useState } from 'react'

interface Project {
  id: string
  name: string
  status: string
  startDate: string
  endDate: string
  progress: number
  type: string
}

interface ProjectTimelineWidgetProps {
  projects: Project[]
}

export default function ProjectTimelineWidget({ projects }: ProjectTimelineWidgetProps) {
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month')

  // Calculate timeline range
  const timelineData = useMemo(() => {
    if (projects.length === 0) return null

    const allDates = projects.flatMap(p => [new Date(p.startDate), new Date(p.endDate)])
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    // Round to start and end of month
    const startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)

    // Generate month columns
    const months: Date[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      months.push(new Date(current))
      current.setMonth(current.getMonth() + 1)
    }

    return {
      startDate,
      endDate,
      months,
      totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    }
  }, [projects, viewMode])

  // Get position and width for a project bar
  const getProjectBarStyle = (project: Project) => {
    if (!timelineData) return { left: '0%', width: '0%' }

    const projectStart = new Date(project.startDate)
    const projectEnd = new Date(project.endDate)

    const daysFromStart = Math.ceil((projectStart.getTime() - timelineData.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const projectDuration = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))

    const left = (daysFromStart / timelineData.totalDays) * 100
    const width = (projectDuration / timelineData.totalDays) * 100

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(1, width)}%`
    }
  }

  // Get color for project status
  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; border: string }> = {
      'planning': { bg: '#E5F4FF', border: '#6A9BFD' },
      'active': { bg: '#E6F9EA', border: '#6BCB77' },
      'on-hold': { bg: '#FFF9E6', border: '#FFD93D' },
      'completed': { bg: '#E5F9F7', border: '#4ECDC4' },
      'cancelled': { bg: '#FEE2E2', border: '#DC2626' }
    }
    return colors[status] || colors['active']
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'residential': '🏠',
      'commercial': '🏢',
      'industrial': '🏭',
      'infrastructure': '🌉',
      'renovation': '🔨'
    }
    return icons[type] || '📋'
  }

  // Format month label
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  if (!timelineData || projects.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
        <span className="text-4xl mb-2 block">📅</span>
        <p className="text-sm font-semibold mb-1" style={{ color: '#1A1A1A' }}>No Projects Yet</p>
        <p className="text-xs" style={{ color: '#4A4A4A' }}>
          Create projects to see timeline visualization
        </p>
      </div>
    )
  }

  // Sort projects by start date
  const sortedProjects = [...projects].sort((a, b) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Project Timeline</h3>
            <p className="text-xs" style={{ color: '#4A4A4A' }}>
              {formatMonth(timelineData.startDate)} - {formatMonth(timelineData.endDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto">
        {/* Month Headers */}
        <div className="flex mb-2 min-w-[800px]">
          {timelineData.months.map((month, index) => (
            <div
              key={index}
              className="flex-1 text-center py-2 border-b-2"
              style={{ borderColor: '#E0E0E0', minWidth: '80px' }}
            >
              <span className="text-xs font-semibold" style={{ color: '#4A4A4A' }}>
                {formatMonth(month)}
              </span>
            </div>
          ))}
        </div>

        {/* Project Rows */}
        <div className="space-y-3 min-w-[800px]">
          {sortedProjects.map((project) => {
            const barStyle = getProjectBarStyle(project)
            const colors = getStatusColor(project.status)

            return (
              <div key={project.id} className="relative">
                {/* Project Name */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{getTypeIcon(project.type)}</span>
                  <span className="text-sm font-semibold truncate" style={{ color: '#1A1A1A', maxWidth: '200px' }}>
                    {project.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg, color: '#1A1A1A' }}>
                    {project.status}
                  </span>
                </div>

                {/* Timeline Bar Container */}
                <div className="relative h-10 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                  {/* Project Bar */}
                  <div
                    className="absolute top-1 h-8 rounded-lg transition-all hover:scale-y-110 cursor-pointer group"
                    style={{
                      left: barStyle.left,
                      width: barStyle.width,
                      backgroundColor: colors.bg,
                      border: `2px solid ${colors.border}`,
                      minWidth: '40px'
                    }}
                  >
                    {/* Progress Indicator */}
                    <div
                      className="h-full rounded-md transition-all"
                      style={{
                        width: `${project.progress}%`,
                        backgroundColor: colors.border,
                        opacity: 0.4
                      }}
                    />

                    {/* Hover Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div
                        className="rounded-lg p-3 shadow-lg whitespace-nowrap"
                        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}
                      >
                        <p className="text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>{project.name}</p>
                        <p className="text-xs" style={{ color: '#4A4A4A' }}>
                          {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#4A4A4A' }}>
                          Progress: {project.progress}%
                        </p>
                      </div>
                      {/* Arrow */}
                      <div
                        className="w-2 h-2 absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 rotate-45"
                        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderTop: 'none', borderLeft: 'none' }}
                      />
                    </div>

                    {/* Progress Text (shown on wider bars) */}
                    {parseFloat(barStyle.width) > 10 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold" style={{ color: colors.border }}>
                          {project.progress}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-4" style={{ borderTop: '1px solid #E0E0E0' }}>
        {[
          { status: 'planning', label: 'Planning' },
          { status: 'active', label: 'Active' },
          { status: 'on-hold', label: 'On Hold' },
          { status: 'completed', label: 'Completed' }
        ].map(({ status, label }) => {
          const colors = getStatusColor(status)
          return (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }}
              />
              <span className="text-xs" style={{ color: '#4A4A4A' }}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4" style={{ borderTop: '1px solid #E0E0E0' }}>
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: '#4A4A4A' }}>Earliest Start</p>
          <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
            {timelineData.startDate.toLocaleDateString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: '#4A4A4A' }}>Latest End</p>
          <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
            {timelineData.endDate.toLocaleDateString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: '#4A4A4A' }}>Total Span</p>
          <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
            {Math.ceil(timelineData.totalDays / 30)} months
          </p>
        </div>
      </div>
    </div>
  )
}
