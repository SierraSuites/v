"use client"

import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

type Task = {
  id: string
  title: string
  status: "not-started" | "in-progress" | "review" | "completed" | "blocked"
  trade: "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general"
  priority: "critical" | "high" | "medium" | "low"
  progress: number
  dueDate: string
  estimatedHours: number
  actualHours: number
}

interface ProgressMetricsWidgetProps {
  tasks: Task[]
}

export default function ProgressMetricsWidget({ tasks }: ProgressMetricsWidgetProps) {
  const { colors, darkMode } = useThemeColors()

  // Status distribution data
  const statusData = [
    { name: 'Not Started', value: tasks.filter(t => t.status === 'not-started').length, color: '#4A4A4A' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#6A9BFD' },
    { name: 'Review', value: tasks.filter(t => t.status === 'review').length, color: '#F59E0B' },
    { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: '#6BCB77' },
    { name: 'Blocked', value: tasks.filter(t => t.status === 'blocked').length, color: '#DC2626' },
  ].filter(item => item.value > 0)

  // Tasks by trade data
  const tradeData = [
    { name: 'Electrical', value: tasks.filter(t => t.trade === 'electrical').length, color: '#FFD93D' },
    { name: 'Plumbing', value: tasks.filter(t => t.trade === 'plumbing').length, color: '#6A9BFD' },
    { name: 'HVAC', value: tasks.filter(t => t.trade === 'hvac').length, color: '#38BDF8' },
    { name: 'Concrete', value: tasks.filter(t => t.trade === 'concrete').length, color: darkMode ? '#9CA3AF' : '#4A4A4A' },
    { name: 'Framing', value: tasks.filter(t => t.trade === 'framing').length, color: '#D97706' },
    { name: 'Finishing', value: tasks.filter(t => t.trade === 'finishing').length, color: darkMode ? '#6B7280' : '#9CA3AF' },
    { name: 'General', value: tasks.filter(t => t.trade === 'general').length, color: '#4ECDC4' },
  ].filter(item => item.value > 0)

  // Completion trend data (last 7 days)
  const getLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      days.push(date.toISOString().split('T')[0])
    }
    return days
  }

  const last7Days = getLast7Days()
  const completionTrendData = last7Days.map(date => {
    const completedCount = tasks.filter(t => t.status === 'completed').length
    const totalCount = tasks.length
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Completion Rate': completionRate
    }
  })

  // Calculate metrics
  const calculateQualityScore = () => {
    const completedTasks = tasks.filter(t => t.status === 'completed')
    if (completedTasks.length === 0) return 0
    const score = (completedTasks.length / tasks.length) * 100
    return Math.round(score)
  }

  const calculateSafetyScore = () => {
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length
    const totalTasks = tasks.length
    if (totalTasks === 0) return 100
    const score = ((totalTasks - blockedTasks) / totalTasks) * 100
    return Math.round(score)
  }

  const calculateBudgetAdherence = () => {
    const tasksWithHours = tasks.filter(t => t.estimatedHours > 0 && t.actualHours > 0)
    if (tasksWithHours.length === 0) return 100
    const totalEstimated = tasksWithHours.reduce((sum, t) => sum + t.estimatedHours, 0)
    const totalActual = tasksWithHours.reduce((sum, t) => sum + t.actualHours, 0)
    if (totalEstimated === 0) return 100
    const adherence = Math.min(100, (totalEstimated / totalActual) * 100)
    return Math.round(adherence)
  }

  const qualityScore = calculateQualityScore()
  const safetyScore = calculateSafetyScore()
  const budgetAdherence = calculateBudgetAdherence()

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#6BCB77'
    if (score >= 60) return '#FFD93D'
    if (score >= 40) return '#F59E0B'
    return '#DC2626'
  }

  const gridColor = darkMode ? 'rgba(255,255,255,0.08)' : '#E0E0E0'
  const tickColor = darkMode ? '#9CA3AF' : '#4A4A4A'

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 rounded-lg" style={{ backgroundColor: colors.bg, border: `1px solid var(--border)`, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p className="text-sm font-semibold" style={{ color: colors.text }}>
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      )
    }
    return null
  }

  const cardStyle = { backgroundColor: colors.bg, border: `1px solid var(--border)`, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Completion Trend Chart */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h3 className="text-lg font-bold mb-4" style={{ color: colors.text }}>Completion Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={completionTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 12 }} />
            <YAxis tick={{ fill: tickColor, fontSize: 12 }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Completion Rate" stroke="#FF6B6B" strokeWidth={3} dot={{ fill: '#FF6B6B', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution Chart */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h3 className="text-lg font-bold mb-4" style={{ color: colors.text }}>Tasks by Status</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Score Gauges */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h3 className="text-lg font-bold mb-6" style={{ color: colors.text }}>Performance Metrics</h3>
        <div className="space-y-6">
          {/* Quality Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>Quality Score</span>
              <span className="text-lg font-bold" style={{ color: getScoreColor(qualityScore) }}>{qualityScore}%</span>
            </div>
            <div className="w-full rounded-full h-3" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${qualityScore}%`, backgroundColor: getScoreColor(qualityScore) }}
              ></div>
            </div>
          </div>

          {/* Safety Compliance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>Safety Compliance</span>
              <span className="text-lg font-bold" style={{ color: getScoreColor(safetyScore) }}>{safetyScore}%</span>
            </div>
            <div className="w-full rounded-full h-3" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${safetyScore}%`, backgroundColor: getScoreColor(safetyScore) }}
              ></div>
            </div>
          </div>

          {/* Budget Adherence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>Budget Adherence</span>
              <span className="text-lg font-bold" style={{ color: getScoreColor(budgetAdherence) }}>{budgetAdherence}%</span>
            </div>
            <div className="w-full rounded-full h-3" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{ width: `${budgetAdherence}%`, backgroundColor: getScoreColor(budgetAdherence) }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks by Trade Chart */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h3 className="text-lg font-bold mb-4" style={{ color: colors.text }}>Tasks by Trade</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={tradeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: tickColor, fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {tradeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
