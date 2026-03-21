"use client"

import { useMemo } from 'react'
import { useTheme } from 'next-themes'
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
  const { theme } = useTheme()
  const darkMode = theme === 'dark'

  const cardBg      = 'var(--c-card-bg)'
  const cardBorder  = 'var(--c-border)'
  const textPrimary    = 'var(--c-text-primary)'
  const textSecondary  = 'var(--c-text-secondary)'
  const subBg       = 'var(--c-sub-bg)'

  const budgetMetrics = useMemo(() => {
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const totalSpent = projects.reduce((sum, p) => sum + (p.spent || 0), 0)
    const totalRemaining = Math.max(0, totalBudget - totalSpent)
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const overBudget = projects.filter(p => p.spent > p.budget)
    const overBudgetCount = overBudget.length
    const overBudgetAmount = overBudget.reduce((sum, p) => sum + (p.spent - p.budget), 0)
    const underBudget = projects.filter(p => p.spent <= p.budget && p.budget > 0)
    const underBudgetSavings = underBudget.reduce((sum, p) => sum + (p.budget - p.spent), 0)
    const activeProjects = projects.filter(p => p.status === 'active')
    const activeBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const activeSpent = activeProjects.reduce((sum, p) => sum + (p.spent || 0), 0)
    return { totalBudget, totalSpent, totalRemaining, utilizationRate, overBudgetCount, overBudgetAmount, underBudgetSavings, activeBudget, activeSpent }
  }, [projects])

  const budgetByStatus = useMemo(() => {
    return ['planning', 'active', 'on-hold', 'completed'].map(status => {
      const statusProjects = projects.filter(p => p.status === status)
      return {
        name: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
        budget: statusProjects.reduce((sum, p) => sum + (p.budget || 0), 0) / 1000,
        spent: statusProjects.reduce((sum, p) => sum + (p.spent || 0), 0) / 1000,
      }
    }).filter(item => item.budget > 0 || item.spent > 0)
  }, [projects])

  const budgetDistribution = useMemo(() => {
    return [
      { name: 'Spent', value: budgetMetrics.totalSpent, color: '#FF6B6B' },
      { name: 'Remaining', value: budgetMetrics.totalRemaining, color: '#6BCB77' },
    ].filter(item => item.value > 0)
  }, [budgetMetrics])

  const topSpendingProjects = useMemo(() => {
    return [...projects].filter(p => p.spent > 0).sort((a, b) => b.spent - a.spent).slice(0, 5)
  }, [projects])

  const atRiskProjects = useMemo(() => {
    return projects.filter(p => {
      const rate = p.budget > 0 ? (p.spent / p.budget) * 100 : 0
      return rate > 80 && p.status !== 'completed'
    })
  }, [projects])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

  const formatPercentage = (value: number) => `${Math.round(value)}%`

  if (projects.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <span className="text-4xl mb-2 block">💰</span>
        <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>No Budget Data</p>
        <p className="text-xs" style={{ color: textSecondary }}>Create projects to track budgets</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-6 space-y-6" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">💰</span>
        <div>
          <h3 className="text-lg font-bold" style={{ color: textPrimary }}>Budget Tracking</h3>
          <p className="text-xs" style={{ color: textSecondary }}>Financial overview across all projects</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: darkMode ? '#1e3558' : '#E5F4FF', border: '1px solid #4ECDC4' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: textPrimary }}>Total Budget</p>
          <p className="text-2xl font-bold" style={{ color: textPrimary }}>{formatCurrency(budgetMetrics.totalBudget)}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: darkMode ? '#3a1a1a' : '#FEE2E2', border: '1px solid #FF6B6B' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: textPrimary }}>Total Spent</p>
          <p className="text-2xl font-bold" style={{ color: textPrimary }}>{formatCurrency(budgetMetrics.totalSpent)}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: darkMode ? '#1a3a2a' : '#E6F9EA', border: '1px solid #6BCB77' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: textPrimary }}>Remaining</p>
          <p className="text-2xl font-bold" style={{ color: textPrimary }}>{formatCurrency(budgetMetrics.totalRemaining)}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: darkMode ? '#3a2e10' : '#FFF9E6', border: '1px solid #FFD93D' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: textPrimary }}>Utilization</p>
          <p className="text-2xl font-bold" style={{ color: textPrimary }}>{formatPercentage(budgetMetrics.utilizationRate)}</p>
        </div>
      </div>

      {/* Budget Utilization Bar */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: subBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold" style={{ color: textPrimary }}>Overall Budget Utilization</p>
          <p className="text-sm font-semibold" style={{ color: textPrimary }}>{formatPercentage(budgetMetrics.utilizationRate)}</p>
        </div>
        <div className="w-full h-6 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--c-border)' }}>
          <div
            className="h-full transition-all relative"
            style={{
              width: `${Math.min(100, budgetMetrics.utilizationRate)}%`,
              backgroundColor: budgetMetrics.utilizationRate > 100 ? '#DC2626' : budgetMetrics.utilizationRate > 80 ? '#FFD93D' : '#6BCB77',
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
          <span className="text-xs" style={{ color: textSecondary }}>{formatCurrency(budgetMetrics.totalSpent)} spent</span>
          <span className="text-xs" style={{ color: textSecondary }}>{formatCurrency(budgetMetrics.totalBudget)} allocated</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-bold mb-3" style={{ color: textPrimary }}>Budget Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={budgetDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={(entry) => formatCurrency(entry.value)}>
                {budgetDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '8px' }}
                labelStyle={{ color: textPrimary, fontWeight: 'bold' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-3">
            {budgetDistribution.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs" style={{ color: textSecondary }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold mb-3" style={{ color: textPrimary }}>Budget by Status ($K)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={budgetByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke={cardBorder} />
              <XAxis dataKey="name" tick={{ fill: textSecondary, fontSize: 12 }} />
              <YAxis tick={{ fill: textSecondary, fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '8px' }}
                labelStyle={{ color: textPrimary, fontWeight: 'bold' }}
              />
              <Bar dataKey="budget" name="Budget" fill="#4ECDC4" radius={[8, 8, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#FF6B6B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      {(budgetMetrics.overBudgetCount > 0 || atRiskProjects.length > 0) && (
        <div className="space-y-3">
          <p className="text-sm font-bold" style={{ color: textPrimary }}>Budget Alerts</p>
          {budgetMetrics.overBudgetCount > 0 && (
            <div className="p-3 rounded-lg flex items-start gap-3" style={{ backgroundColor: darkMode ? '#3a1a1a' : '#FEE2E2', border: '2px solid #DC2626' }}>
              <span className="text-xl shrink-0">🚨</span>
              <div>
                <p className="text-sm font-bold" style={{ color: textPrimary }}>Over Budget Projects</p>
                <p className="text-xs mt-1" style={{ color: textSecondary }}>
                  {budgetMetrics.overBudgetCount} project{budgetMetrics.overBudgetCount > 1 ? 's are' : ' is'} over budget by {formatCurrency(budgetMetrics.overBudgetAmount)}
                </p>
              </div>
            </div>
          )}
          {atRiskProjects.length > 0 && (
            <div className="p-3 rounded-lg flex items-start gap-3" style={{ backgroundColor: darkMode ? '#3a2e10' : '#FEF3C7', border: '2px solid #F59E0B' }}>
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-bold" style={{ color: textPrimary }}>At-Risk Projects</p>
                <p className="text-xs mt-1" style={{ color: textSecondary }}>
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
          <p className="text-sm font-bold mb-3" style={{ color: textPrimary }}>Top Spending Projects</p>
          <div className="space-y-2">
            {topSpendingProjects.map((project, index) => {
              const rate = project.budget > 0 ? (project.spent / project.budget) * 100 : 0
              const isOverBudget = project.spent > project.budget
              return (
                <div key={project.id} className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: subBg, border: `1px solid ${cardBorder}` }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: textSecondary }}>#{index + 1}</span>
                      <span className="text-sm font-semibold" style={{ color: textPrimary }}>{project.name}</span>
                      {isOverBudget && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: darkMode ? '#3a1a1a' : '#FEE2E2', color: '#DC2626' }}>Over Budget</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs" style={{ color: textSecondary }}>Spent: {formatCurrency(project.spent)}</span>
                      <span className="text-xs" style={{ color: textSecondary }}>Budget: {formatCurrency(project.budget)}</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold" style={{ color: isOverBudget ? '#DC2626' : rate > 80 ? '#F59E0B' : '#6BCB77' }}>
                    {formatPercentage(rate)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: `1px solid ${cardBorder}` }}>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: subBg }}>
          <p className="text-xs mb-1" style={{ color: textSecondary }}>Active Projects Budget</p>
          <p className="text-lg font-bold" style={{ color: textPrimary }}>{formatCurrency(budgetMetrics.activeBudget)}</p>
          <p className="text-xs mt-1" style={{ color: textSecondary }}>{formatCurrency(budgetMetrics.activeSpent)} spent</p>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: subBg }}>
          <p className="text-xs mb-1" style={{ color: textSecondary }}>Savings from Under-Budget</p>
          <p className="text-lg font-bold" style={{ color: '#6BCB77' }}>{formatCurrency(budgetMetrics.underBudgetSavings)}</p>
          <p className="text-xs mt-1" style={{ color: textSecondary }}>Across {projects.filter(p => p.spent <= p.budget && p.budget > 0).length} projects</p>
        </div>
      </div>
    </div>
  )
}
