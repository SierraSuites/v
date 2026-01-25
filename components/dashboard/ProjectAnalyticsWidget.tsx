"use client"

import { useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Project {
  id: string
  name: string
  type: string
  status: string
  progress: number
  budget: number
  spent: number
  startDate: string
  endDate: string
}

interface ProjectAnalyticsWidgetProps {
  projects: Project[]
}

export default function ProjectAnalyticsWidget({ projects }: ProjectAnalyticsWidgetProps) {
  // Calculate stats
  const stats = useMemo(() => {
    const total = projects.length
    const active = projects.filter(p => p.status === 'active').length
    const completed = projects.filter(p => p.status === 'completed').length
    const onHold = projects.filter(p => p.status === 'on-hold').length
    const planning = projects.filter(p => p.status === 'planning').length

    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0)
    const averageProgress = total > 0 ? projects.reduce((sum, p) => sum + p.progress, 0) / total : 0

    return {
      total,
      active,
      completed,
      onHold,
      planning,
      totalBudget,
      totalSpent,
      averageProgress: Math.round(averageProgress)
    }
  }, [projects])

  // Project by type data
  const projectsByType = useMemo(() => {
    const types = ['residential', 'commercial', 'industrial', 'infrastructure', 'renovation']
    return types.map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      count: projects.filter(p => p.type === type).length
    })).filter(item => item.count > 0)
  }, [projects])

  // Budget data
  const budgetData = useMemo(() => {
    return [
      { name: 'Allocated', value: stats.totalBudget, color: '#4ECDC4' },
      { name: 'Spent', value: stats.totalSpent, color: '#FF6B6B' },
      { name: 'Remaining', value: Math.max(0, stats.totalBudget - stats.totalSpent), color: '#6BCB77' }
    ].filter(item => item.value > 0)
  }, [stats])

  // Status distribution
  const statusData = useMemo(() => {
    return [
      { name: 'Active', value: stats.active, color: '#6BCB77' },
      { name: 'Planning', value: stats.planning, color: '#6A9BFD' },
      { name: 'On Hold', value: stats.onHold, color: '#FFD93D' },
      { name: 'Completed', value: stats.completed, color: '#4ECDC4' }
    ].filter(item => item.value > 0)
  }, [stats])

  // Progress over time (last 6 months)
  const progressOverTime = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const now = new Date()

    return months.map((month, index) => {
      // Calculate average progress for projects in this month
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const projectsInMonth = projects.filter(p => {
        const startDate = new Date(p.startDate)
        const endDate = new Date(p.endDate)
        return startDate <= monthDate && endDate >= monthDate
      })

      const avgProgress = projectsInMonth.length > 0
        ? projectsInMonth.reduce((sum, p) => sum + p.progress, 0) / projectsInMonth.length
        : 0

      return {
        month,
        progress: Math.round(avgProgress)
      }
    })
  }, [projects])

  // Budget utilization by project type
  const budgetByType = useMemo(() => {
    const types = ['residential', 'commercial', 'industrial', 'infrastructure', 'renovation']
    return types.map(type => {
      const typeProjects = projects.filter(p => p.type === type)
      const budget = typeProjects.reduce((sum, p) => sum + (p.budget || 0), 0)
      const spent = typeProjects.reduce((sum, p) => sum + (p.spent || 0), 0)

      return {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        budget: budget / 1000, // Convert to thousands
        spent: spent / 1000
      }
    }).filter(item => item.budget > 0 || item.spent > 0)
  }, [projects])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
        <span className="text-4xl mb-2 block">📊</span>
        <p className="text-sm font-semibold mb-1" style={{ color: '#1A1A1A' }}>No Projects Yet</p>
        <p className="text-xs" style={{ color: '#4A4A4A' }}>
          Create your first project to see analytics
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-6 space-y-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Project Analytics</h3>
        <span className="text-2xl">📊</span>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#4A4A4A' }}>Total Projects</p>
          <p className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#E6F9EA', border: '1px solid #6BCB77' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>Active</p>
          <p className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>{stats.active}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#E5F4FF', border: '1px solid #4ECDC4' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>Completed</p>
          <p className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>{stats.completed}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#FFF9E6', border: '1px solid #FFD93D' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>Avg Progress</p>
          <p className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>{stats.averageProgress}%</p>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}>
        <p className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Budget Overview</p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: '#4A4A4A' }}>Total Budget</p>
            <p className="text-lg font-bold" style={{ color: '#4ECDC4' }}>{formatCurrency(stats.totalBudget)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#4A4A4A' }}>Total Spent</p>
            <p className="text-lg font-bold" style={{ color: '#FF6B6B' }}>{formatCurrency(stats.totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#4A4A4A' }}>Remaining</p>
            <p className="text-lg font-bold" style={{ color: '#6BCB77' }}>
              {formatCurrency(Math.max(0, stats.totalBudget - stats.totalSpent))}
            </p>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#E0E0E0' }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${Math.min(100, (stats.totalSpent / stats.totalBudget) * 100)}%`,
              backgroundColor: stats.totalSpent > stats.totalBudget ? '#DC2626' : '#FF6B6B'
            }}
          />
        </div>
        <p className="text-xs mt-2 text-right" style={{ color: '#4A4A4A' }}>
          {stats.totalBudget > 0 ? Math.round((stats.totalSpent / stats.totalBudget) * 100) : 0}% of budget used
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Status Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                labelStyle={{ color: '#1A1A1A', fontWeight: 'bold' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {statusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs" style={{ color: '#4A4A4A' }}>
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects by Type Bar Chart */}
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Projects by Type</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projectsByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="name" tick={{ fill: '#4A4A4A', fontSize: 12 }} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                labelStyle={{ color: '#1A1A1A', fontWeight: 'bold' }}
              />
              <Bar dataKey="count" fill="#FF6B6B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Over Time Line Chart */}
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Progress Trend (6 Months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="month" tick={{ fill: '#4A4A4A', fontSize: 12 }} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                labelStyle={{ color: '#1A1A1A', fontWeight: 'bold' }}
              />
              <Line
                type="monotone"
                dataKey="progress"
                stroke="#4ECDC4"
                strokeWidth={3}
                dot={{ fill: '#4ECDC4', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Budget by Type Bar Chart */}
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Budget by Type ($K)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={budgetByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="name" tick={{ fill: '#4A4A4A', fontSize: 12 }} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                labelStyle={{ color: '#1A1A1A', fontWeight: 'bold' }}
              />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill="#4ECDC4" radius={[8, 8, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#FF6B6B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
