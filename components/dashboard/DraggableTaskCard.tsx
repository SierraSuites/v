"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Task = {
  id: string
  title: string
  project: string
  trade: "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general"
  priority: "critical" | "high" | "medium" | "low"
  status: "not-started" | "in-progress" | "review" | "completed" | "blocked"
  dueDate: string
  progress: number
  attachments: number
  comments: number
  dependencies: string[]
  weatherDependent: boolean
  inspectionRequired: boolean
  assigneeAvatar: string
  assignee: string
}

const tradeColors = {
  electrical: { bg: "#FFF9E6", border: "#FFD93D", text: "#1A1A1A" },
  plumbing: { bg: "#E5F4FF", border: "#6A9BFD", text: "#1A1A1A" },
  hvac: { bg: "#F0F9FF", border: "#38BDF8", text: "#1A1A1A" },
  concrete: { bg: "#F8F9FA", border: "#4A4A4A", text: "#1A1A1A" },
  framing: { bg: "#FFF5EB", border: "#D97706", text: "#1A1A1A" },
  finishing: { bg: "#FFFFFF", border: "#E0E0E0", text: "#1A1A1A" },
  general: { bg: "#F8F9FA", border: "#E0E0E0", text: "#1A1A1A" }
}

const priorityStyles = {
  critical: { icon: "🔥", color: "#DC2626", bg: "#FEE2E2" },
  high: { icon: "⚠️", color: "#F59E0B", bg: "#FEF3C7" },
  medium: { icon: "➡️", color: "#FFD93D", bg: "#FFF9E6" },
  low: { icon: "✅", color: "#6BCB77", bg: "#E6F9EA" }
}

interface DraggableTaskCardProps {
  task: Task
}

export default function DraggableTaskCard({ task }: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Quality Guide lines 958-998: Overdue detection
  const isOverdue = task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed'

  // Quality Guide lines 966-968: Blocked card visual
  const isBlocked = task.status === 'blocked'

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-1 hover:shadow-md ${
        isBlocked ? 'opacity-60 border-2 border-red-300' : ''
      }`}
      style={{
        ...style,
        backgroundColor: '#FFFFFF',
        borderLeft: isBlocked ? undefined : `4px solid ${tradeColors[task.trade].border}`,
        boxShadow: isDragging
          ? '0 8px 16px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)'
          : '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      {/* Quality Guide lines 971-982: Priority badges */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {task.priority === 'critical' && (
            <span className="inline-block px-2 py-0.5 text-xs rounded" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
              {priorityStyles.critical.icon} CRITICAL
            </span>
          )}
          {task.priority === 'high' && (
            <span className="inline-block px-2 py-0.5 text-xs rounded" style={{ backgroundColor: '#FEF3C7', color: '#C2410C' }}>
              {priorityStyles.high.icon} HIGH
            </span>
          )}
          {task.priority === 'medium' && (
            <span className="inline-block px-2 py-0.5 text-xs rounded" style={{ backgroundColor: '#FFF9E6', color: '#92400E' }}>
              {priorityStyles.medium.icon}
            </span>
          )}
          {task.priority === 'low' && (
            <span className="inline-block px-2 py-0.5 text-xs rounded" style={{ backgroundColor: '#E6F9EA', color: '#166534' }}>
              {priorityStyles.low.icon}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {task.weatherDependent && <span className="text-sm">🌤️</span>}
          {task.inspectionRequired && <span className="text-sm">🔍</span>}
        </div>
      </div>

      <h4 className="font-semibold text-sm mb-2" style={{ color: '#1A1A1A' }}>{task.title}</h4>

      {/* Quality Guide lines 1031-1035: Blocked reason */}
      {isBlocked && (
        <p className="text-xs mb-2" style={{ color: '#DC2626' }}>
          ⛔ Blocked{task.dependencies?.length > 0 ? ` — Waiting for ${task.dependencies.length} task${task.dependencies.length !== 1 ? 's' : ''}` : ''}
        </p>
      )}

      {/* Quality Guide lines 1017-1028: Dependency & blocking indicators */}
      {!isBlocked && task.dependencies?.length > 0 && (
        <p className="text-xs mb-2" style={{ color: '#2563EB' }}>
          🔗 {task.dependencies.length} dependenc{task.dependencies.length !== 1 ? 'ies' : 'y'}
        </p>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: tradeColors[task.trade].bg, color: tradeColors[task.trade].text }}>
          {task.trade}
        </span>
        {/* Quality Guide lines 994-998: Overdue date in red */}
        <span className={`text-xs ${isOverdue ? 'font-semibold' : ''}`} style={{ color: isOverdue ? '#DC2626' : '#4A4A4A' }}>
          📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {isOverdue && ' (OVERDUE)'}
        </span>
      </div>

      <p className="text-xs mb-3" style={{ color: '#4A4A4A' }}>{task.project}</p>

      {/* Progress bar — Quality Guide lines 1044-1049 */}
      <div className="mb-3">
        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#E0E0E0' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${task.progress}%`,
              backgroundColor: isBlocked ? '#DC2626' : tradeColors[task.trade].border
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #5FD9CF 100%)' }}>
            {task.assigneeAvatar}
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: '#4A4A4A' }}>
            {task.attachments > 0 && <span>📎{task.attachments}</span>}
            {task.comments > 0 && <span>💬{task.comments}</span>}
          </div>
        </div>
        <span className="text-xs font-semibold" style={{ color: isBlocked ? '#DC2626' : tradeColors[task.trade].border }}>{task.progress}%</span>
      </div>
    </div>
  )
}
