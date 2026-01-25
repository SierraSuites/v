"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Task = {
  id: string
  title: string
  project: string
  trade: "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general"
  priority: "critical" | "high" | "medium" | "low"
  dueDate: string
  progress: number
  attachments: number
  comments: number
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

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-1"
      style={{
        ...style,
        backgroundColor: '#FFFFFF',
        borderLeft: `4px solid ${tradeColors[task.trade].border}`,
        boxShadow: isDragging
          ? '0 8px 16px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)'
          : '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-lg">{priorityStyles[task.priority].icon}</span>
        <div className="flex items-center gap-1">
          {task.weatherDependent && <span className="text-sm">🌤️</span>}
          {task.inspectionRequired && <span className="text-sm">🔍</span>}
        </div>
      </div>

      <h4 className="font-semibold text-sm mb-2" style={{ color: '#1A1A1A' }}>{task.title}</h4>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: tradeColors[task.trade].bg, color: tradeColors[task.trade].text }}>
          {task.trade}
        </span>
        <span className="text-xs" style={{ color: '#4A4A4A' }}>📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>

      <p className="text-xs mb-3" style={{ color: '#4A4A4A' }}>{task.project}</p>

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
        <span className="text-xs font-semibold" style={{ color: tradeColors[task.trade].border }}>{task.progress}%</span>
      </div>
    </div>
  )
}
