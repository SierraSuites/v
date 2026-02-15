"use client"

import { useState } from "react"
import { useThemeColors } from '@/lib/hooks/useThemeColors'

type Task = {
  id: string
  title: string
  assignee: string
  assigneeId: string
  dueDate: string
  estimatedHours: number
  trade: string
  priority: "critical" | "high" | "medium" | "low"
}

type TeamMember = {
  id: string
  name: string
  avatar: string
  role: string
  trades: string[]
}

interface TeamAllocationHeatmapProps {
  tasks: Task[]
  teamMembers: TeamMember[]
}

export default function TeamAllocationHeatmap({ tasks, teamMembers }: TeamAllocationHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{ memberId: string; date: string } | null>(null)

  // Get the next 7 days
  const today = new Date()
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    return date
  })

  const { colors, darkMode } = useThemeColors()

  // Calculate workload for each team member on each day
  const getWorkloadForDay = (memberId: string, date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const memberTasks = tasks.filter(
      task => task.assigneeId === memberId && task.dueDate === dateString
    )
    const totalHours = memberTasks.reduce((sum, task) => sum + task.estimatedHours, 0)
    return { hours: totalHours, tasks: memberTasks }
  }

  // Get color based on workload — dark mode uses darker tinted backgrounds
  const getWorkloadColor = (hours: number) => {
    if (hours === 0) return { bg: 'var(--muted)', text: 'var(--muted-foreground)', border: 'var(--border)' }
    if (hours <= 4) return { bg: darkMode ? '#1a3a2a' : '#E6F9EA', text: darkMode ? '#6BCB77' : '#1A5E2A', border: '#6BCB77' }
    if (hours <= 8) return { bg: darkMode ? '#3a3218' : '#FFF9E6', text: darkMode ? '#FFD93D' : '#7A5E00', border: '#FFD93D' }
    if (hours <= 12) return { bg: darkMode ? '#3a2c10' : '#FEF3C7', text: darkMode ? '#F59E0B' : '#92400E', border: '#F59E0B' }
    return { bg: darkMode ? '#3a1515' : '#FEE2E2', text: darkMode ? '#F87171' : '#991B1B', border: '#DC2626' }
  }

  // Get workload label
  const getWorkloadLabel = (hours: number) => {
    if (hours === 0) return "Free"
    if (hours <= 4) return "Light"
    if (hours <= 8) return "Normal"
    if (hours <= 12) return "Busy"
    return "Overloaded"
  }

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: date.getMonth() + 1
    }
  }

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold mb-1" style={{ color: colors.text }}>Team Allocation Heatmap</h3>
          <p className="text-sm" style={{ color: colors.textMuted }}>Workload distribution for the next 7 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#1a3a2a' : '#E6F9EA', border: '1px solid #6BCB77' }}></div>
            <span style={{ color: colors.textMuted }}>Light (≤4h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#3a3218' : '#FFF9E6', border: '1px solid #FFD93D' }}></div>
            <span style={{ color: colors.textMuted }}>Normal (≤8h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#3a2c10' : '#FEF3C7', border: '1px solid #F59E0B' }}></div>
            <span style={{ color: colors.textMuted }}>Busy (≤12h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: darkMode ? '#3a1515' : '#FEE2E2', border: '1px solid #DC2626' }}></div>
            <span style={{ color: colors.textMuted }}>Overloaded (&gt;12h)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 sticky left-0 z-10" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                <span className="text-sm font-semibold" style={{ color: colors.text }}>Team Member</span>
              </th>
              {next7Days.map((date) => {
                const formatted = formatDate(date)
                const isToday = date.toDateString() === today.toDateString()
                return (
                  <th
                    key={date.toISOString()}
                    className="p-3 text-center"
                    style={{
                      backgroundColor: isToday ? (darkMode ? '#3a3218' : '#FFF9E6') : colors.bgAlt,
                      borderBottom: `2px solid var(--border)`,
                      borderLeft: isToday ? '2px solid #FFD93D' : 'none',
                      borderRight: isToday ? '2px solid #FFD93D' : 'none'
                    }}
                  >
                    <div className="text-xs font-semibold" style={{ color: isToday ? (darkMode ? '#FFD93D' : '#1A1A1A') : colors.textMuted }}>
                      {formatted.day}
                    </div>
                    <div className="text-sm font-bold" style={{ color: isToday ? (darkMode ? '#FFD93D' : '#1A1A1A') : colors.text }}>
                      {formatted.month}/{formatted.date}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr key={member.id} className="transition-colors" style={{ backgroundColor: colors.bg }}>
                <td className="p-3 sticky left-0 z-10" style={{ backgroundColor: colors.bg, borderBottom: `1px solid var(--border)` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #5FD9CF 100%)' }}>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: colors.text }}>{member.name}</p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{member.role}</p>
                    </div>
                  </div>
                </td>
                {next7Days.map((date) => {
                  const { hours, tasks: dayTasks } = getWorkloadForDay(member.id, date)
                  const cellColors = getWorkloadColor(hours)
                  const isToday = date.toDateString() === today.toDateString()
                  const cellKey = `${member.id}-${date.toISOString().split('T')[0]}`
                  const isSelected = selectedCell?.memberId === member.id && selectedCell?.date === date.toISOString().split('T')[0]

                  return (
                    <td
                      key={cellKey}
                      className="p-2 text-center cursor-pointer transition-all hover:scale-105"
                      style={{
                        backgroundColor: cellColors.bg,
                        borderBottom: `1px solid var(--border)`,
                        borderLeft: isToday ? '2px solid #FFD93D' : `1px solid ${cellColors.border}`,
                        borderRight: isToday ? '2px solid #FFD93D' : `1px solid ${cellColors.border}`,
                        borderTop: isSelected ? `2px solid ${cellColors.border}` : `1px solid ${cellColors.border}`,
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                      }}
                      onClick={() => {
                        if (hours > 0) {
                          setSelectedCell({ memberId: member.id, date: date.toISOString().split('T')[0] })
                        }
                      }}
                    >
                      <div className="text-sm font-bold mb-0.5" style={{ color: cellColors.text }}>
                        {hours > 0 ? `${hours}h` : '—'}
                      </div>
                      <div className="text-xs" style={{ color: cellColors.text, opacity: 0.8 }}>
                        {hours > 0 && getWorkloadLabel(hours)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Task Details Popup */}
      {selectedCell && (
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: `1px solid var(--border)` }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm" style={{ color: colors.text }}>
              {teamMembers.find(m => m.id === selectedCell.memberId)?.name} - {new Date(selectedCell.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h4>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-sm font-semibold hover:underline"
              style={{ color: '#FF6B6B' }}
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            {tasks
              .filter(task => task.assigneeId === selectedCell.memberId && task.dueDate === selectedCell.date)
              .map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: colors.bg, border: `1px solid var(--border)` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1" style={{ color: colors.text }}>{task.title}</p>
                      <div className="flex items-center gap-3 text-xs" style={{ color: colors.textMuted }}>
                        <span>⏱️ {task.estimatedHours}h</span>
                        <span className="px-2 py-0.5 rounded" style={{ backgroundColor: darkMode ? '#3a3218' : '#FFF9E6', color: darkMode ? '#FFD93D' : '#7A5E00' }}>
                          {task.trade}
                        </span>
                      </div>
                    </div>
                    <span className="text-lg">
                      {task.priority === 'critical' && '🔥'}
                      {task.priority === 'high' && '⚠️'}
                      {task.priority === 'medium' && '➡️'}
                      {task.priority === 'low' && '✅'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
