"use client"

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

interface Project {
  id: string
  name: string
  budget: number
  spent: number
  status: string
  type: string
}

interface BudgetTrackingWidgetProps {
  projects: Project[]
}

export default function BudgetTrackingWidget({ projects }: BudgetTrackingWidgetProps) {
  // Calculate budget metrics
  const budgetMetrics = useMemo(() => {
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0)
    const totalRemaining = Math.max(0, totalBudget - totalSpent)
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

    // Projects over budget
    const overBudget = projects.filter(p => p.spent > p.budget)
    const overBudgetCount = overBudget.length
    const overBudgetAmount = overBudget.reduce((sum, p) => sum + (p.spent - p.budget), 0)

    // Projects under budget
    const underBudget = projects.filter(p => p.spent <= p.budget && p.budget > 0)
    const underBudgetSavings = underBudget.reduce((sum, p) => sum + (p.budget - p.spent), 0)

    // Active projects budget
    const activeProjects = projects.filter(p => p.status === 'active')
    const activeBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const activeSpent = activeProjects.reduce((sum, p) => sum + (p.spent || 0), 0)

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      utilizationRate,
      overBudgetCount,
      overBudgetAmount,
      underBudgetSavings,
      activeBudget,
      activeSpent
    }
  }, [projects])

  // Budget distribution by status
  const budgetByStatus = useMemo(() => {
    const statuses = ['planning', 'active', 'on-hold', 'completed']
    return statuses.map(status => {
      const statusProjects = projects.filter(p => p.status === status)
      const budget = statusProjects.reduce((sum, p) => sum + (p.budget || 0), 0)
      const spent = statusProjects.reduce((sum, p) => sum + (p.spent || 0), 0)

      return {
        name: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
        budget: budget / 1000,
        spent: spent / 1000
      }
    }).filter(item => item.budget > 0 || item.spent > 0)
  }, [projects])

  // Budget distribution pie chart
  const budgetDistribution = useMemo(() => {
    return [
      { name: 'Spent', value: budgetMetrics.totalSpent, color: '#FF6B6B' },
      { name: 'Remaining', value: budgetMetrics.totalRemaining, color: '#6BCB77' }
    ].filter(item => item.value > 0)
  }, [budgetMetrics])

  // Top spending projects
  const topSpendingProjects = useMemo(() => {
    return [...projects]
      .filter(p => p.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)
  }, [projects])

  // Projects at risk (>80% budget used but not completed)
  const atRiskProjects = useMemo(() => {
    return projects.filter(p => {
      const utilizationRate = p.budget > 0 ? (p.spent / p.budget) * 100 : 0
      return utilizationRate > 80 && p.status !== 'completed'
    })
  }, [projects])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
        <span className="text-4xl mb-2 block">💰</span>
        <p className="text-sm font-semibold mb-1" style={{ color: '#1A1A1A' }}>No Budget Data</p>
        <p className="text-xs" style={{ color: '#4A4A4A' }}>
          Create projects to track budgets
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-6 space-y-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Budget Tracking</h3>
            <p className="text-xs" style={{ color: '#4A4A4A' }}>Financial overview across all projects</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#E5F4FF', border: '1px solid #4ECDC4' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>Total Budget</p>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{formatCurrency(budgetMetrics.totalBudget)}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FF6B6B' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>Total Spent</p>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{formatCurrency(budgetMetrics.totalSpent)}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#E6F9EA', border: '1px solid #6BCB77' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>Remaining</p>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{formatCurrency(budgetMetrics.totalRemaining)}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#FFF9E6', border: '1px solid #FFD93D' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#1A1A1A' }}>Utilization</p>
          <p className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{formatPercentage(budgetMetrics.utilizationRate)}</p>
        </div>
      </div>

      {/* Budget Utilization Bar */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Overall Budget Utilization</p>
          <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
            {formatPercentage(budgetMetrics.utilizationRate)}
          </p>
        </div>
        <div className="w-full h-6 rounded-full overflow-hidden" style={{ backgroundColor: '#E0E0E0' }}>
          <div
            className="h-full transition-all relative"
            style={{
              width: `${Math.min(100, budgetMetrics.utilizationRate)}%`,
              backgroundColor: budgetMetrics.utilizationRate > 100 ? '#DC2626' :
                budgetMetrics.utilizationRate > 80 ? '#FFD93D' : '#6BCB77'
            }}
          >
            {budgetMetrics.utilizationRate > 100 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white">OVER BUDGET</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: '#4A4A4A' }}>
            {formatCurrency(budgetMetrics.totalSpent)} spent
          </span>
          <span className="text-xs" style={{ color: '#4A4A4A' }}>
            {formatCurrency(budgetMetrics.totalBudget)} allocated
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Budget Distribution Pie Chart */}
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Budget Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={budgetDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={(entry) => formatCurrency(entry.value)}
              >
                {budgetDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                labelStyle={{ color: '#1A1A1A', fontWeight: 'bold' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-3">
            {budgetDistribution.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs" style={{ color: '#4A4A4A' }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget by Status Bar Chart */}
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Budget by Status ($K)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={budgetByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="name" tick={{ fill: '#4A4A4A', fontSize: 12 }} />
              <YAxis tick={{ fill: '#4A4A4A', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                labelStyle={{ color: '#1A1A1A', fontWeight: 'bold' }}
              />
              <Bar dataKey="budget" name="Budget" fill="#4ECDC4" radius={[8, 8, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#FF6B6B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts and Warnings */}
      {(budgetMetrics.overBudgetCount > 0 || atRiskProjects.length > 0) && (
        <div className="space-y-3">
          <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Budget Alerts</p>

          {budgetMetrics.overBudgetCount > 0 && (
            <div
              className="p-3 rounded-lg flex items-start gap-3"
              style={{ backgroundColor: '#FEE2E2', border: '2px solid #DC2626' }}
            >
              <span className="text-xl flex-shrink-0">🚨</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>Over Budget Projects</p>
                <p className="text-xs mt-1" style={{ color: '#4A4A4A' }}>
                  {budgetMetrics.overBudgetCount} project{budgetMetrics.overBudgetCount > 1 ? 's are' : ' is'} over budget by {formatCurrency(budgetMetrics.overBudgetAmount)}
                </p>
              </div>
            </div>
          )}

          {atRiskProjects.length > 0 && (
            <div
              className="p-3 rounded-lg flex items-start gap-3"
              style={{ backgroundColor: '#FEF3C7', border: '2px solid #F59E0B' }}
            >
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>At-Risk Projects</p>
                <p className="text-xs mt-1" style={{ color: '#4A4A4A' }}>
                  {atRiskProjects.length} project{atRiskProjects.length > 1 ? 's have' : ' has'} used over 80% of allocated budget
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Spending Projects */}
      {topSpendingProjects.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Top Spending Projects</p>
          <div className="space-y-2">
            {topSpendingProjects.map((project, index) => {
              const utilizationRate = project.budget > 0 ? (project.spent / project.budget) * 100 : 0
              const isOverBudget = project.spent > project.budget

              return (
                <div
                  key={project.id}
                  className="p-3 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E0E0' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: '#4A4A4A' }}>
                        #{index + 1}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                        {project.name}
                      </span>
                      {isOverBudget && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                          Over Budget
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs" style={{ color: '#4A4A4A' }}>
                        Spent: {formatCurrency(project.spent)}
                      </span>
                      <span className="text-xs" style={{ color: '#4A4A4A' }}>
                        Budget: {formatCurrency(project.budget)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-bold"
                      style={{ color: isOverBudget ? '#DC2626' : utilizationRate > 80 ? '#F59E0B' : '#6BCB77' }}
                    >
                      {formatPercentage(utilizationRate)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid #E0E0E0' }}>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
          <p className="text-xs mb-1" style={{ color: '#4A4A4A' }}>Active Projects Budget</p>
          <p className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{formatCurrency(budgetMetrics.activeBudget)}</p>
          <p className="text-xs mt-1" style={{ color: '#4A4A4A' }}>
            {formatCurrency(budgetMetrics.activeSpent)} spent
          </p>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
          <p className="text-xs mb-1" style={{ color: '#4A4A4A' }}>Savings from Under-Budget</p>
          <p className="text-lg font-bold" style={{ color: '#6BCB77' }}>{formatCurrency(budgetMetrics.underBudgetSavings)}</p>
          <p className="text-xs mt-1" style={{ color: '#4A4A4A' }}>
            Across {projects.filter(p => p.spent <= p.budget && p.budget > 0).length} projects
          </p>
        </div>
      </div>
    </div>
  )
}
