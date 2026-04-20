'use client'

// ============================================================================
// PROJECT OVERVIEW TAB
// Summary of project information, recent activity, and key metrics
// ============================================================================

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProjectDetails, ProjectMilestone } from '@/lib/projects/get-project-details'
import { Calendar, TrendingUp, FileText, Users, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface Props {
  project: ProjectDetails
}

export default function ProjectOverviewTab({ project }: Props) {
  const { colors, darkMode } = useThemeColors()
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(project.milestones)
  const [expenses, setExpenses] = useState(project.expenses)

  useEffect(() => {
    const supabase = createClient()

    async function fetchLiveData() {
      const [milestonesRes, expensesRes] = await Promise.all([
        supabase.from('project_milestones').select('*').eq('project_id', project.id).order('due_date', { ascending: true }),
        supabase.from('project_expenses').select('*').eq('project_id', project.id).order('date', { ascending: false })
      ])
      if (milestonesRes.data) setMilestones(milestonesRes.data as ProjectMilestone[])
      if (expensesRes.data) setExpenses(expensesRes.data as typeof project.expenses)
    }

    fetchLiveData()
  }, [project.id])

  // Calculate completion percentage by milestone
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalMilestones = milestones.length
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  // Get upcoming milestones
  const upcomingMilestones = milestones
    .filter(m => m.status !== 'completed' && m.status !== 'cancelled')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)

  // Get recent expenses
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  // Calculate expense breakdown
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category || 'other'
    acc[category] = (acc[category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)

  const topCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Project Description */}
      {project.description && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Project Description</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Milestones Progress */}
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Milestones</div>
              <div className="text-lg font-bold" style={{ color: colors.text }}>
                {completedMilestones} <span className="text-sm font-normal" style={{ color: colors.textMuted }}>/ {totalMilestones}</span>
              </div>
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${milestoneProgress}%`, backgroundColor: '#7C3AED' }} />
          </div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>{milestoneProgress.toFixed(0)}% complete</div>
        </div>

        {/* Documents */}
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}>
              <FileText className="w-5 h-5" style={{ color: '#2563EB' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Documents</div>
              <div className="text-lg font-bold" style={{ color: colors.text }}>{project.documents.length}</div>
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#374151' : '#E5E7EB' }}>
            <div className="h-full rounded-full transition-all" style={{ width: project.documents.length > 0 ? '100%' : '0%', backgroundColor: '#2563EB' }} />
          </div>
          <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
            {project.documents.filter(d => d.category === 'blueprint').length} blueprints · {project.documents.filter(d => d.category === 'contract').length} contracts
          </div>
        </div>

        {/* Team Size */}
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
              <Users className="w-5 h-5" style={{ color: '#16A34A' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: colors.textMuted }}>Team Members</div>
              <div className="text-lg font-bold" style={{ color: colors.text }}>{project.teamMembers.length}</div>
            </div>
          </div>
          <div className="flex -space-x-2 mt-1">
            {project.teamMembers.slice(0, 5).map((member, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white overflow-hidden"
                style={{ backgroundColor: '#6B7280', border: `2px solid ${colors.bgAlt}` }}
                title={member.name}
              >
                {member.avatar ? (
                  <img src={member.avatar} className="w-full h-full object-cover" alt={member.name} />
                ) : (
                  member.name.charAt(0)
                )}
              </div>
            ))}
            {project.teamMembers.length > 5 && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: colors.bgMuted, border: `2px solid ${colors.bgAlt}`, color: colors.textMuted }}
              >
                +{project.teamMembers.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Milestones */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Milestones</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {upcomingMilestones.length > 0 ? (
              upcomingMilestones.map((milestone) => {
                const dueDate = new Date(milestone.due_date)
                const today = new Date()
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const isOverdue = daysUntil < 0

                return (
                  <div key={milestone.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{milestone.name}</h3>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{milestone.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{format(dueDate, 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isOverdue
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              : daysUntil < 7
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {isOverdue ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              {Math.abs(daysUntil)} days overdue
                            </>
                          ) : daysUntil === 0 ? (
                            'Due today'
                          ) : (
                            `${daysUntil} days`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p>No upcoming milestones</p>
              </div>
            )}
          </div>
        </div>

        {/* Budget Breakdown */}
        <div className="rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
          <div className="p-5" style={{ borderBottom: colors.borderBottom }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: colors.text }}>Budget Breakdown</h2>
              {project.designSelectionsSummary.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: darkMode ? 'rgba(37,99,235,0.15)' : '#DBEAFE', color: '#2563EB' }}>
                  Projected
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            {(() => {
              const hasSelections = project.designSelectionsSummary.length > 0
              const displaySpend = hasSelections ? project.projectedSpend : totalSpent
              const remaining = project.estimated_budget - displaySpend
              const trackBg = darkMode ? '#374151' : '#E5E7EB'
              return topCategories.length > 0 ? (
                <div className="space-y-4">
                  {topCategories.map(([category, amount]) => {
                    const percentage = displaySpend > 0 ? (amount / displaySpend) * 100 : 0
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium capitalize" style={{ color: colors.text }}>{category}</span>
                          <span className="text-sm font-semibold" style={{ color: colors.text }}>
                            ${(amount / 1000).toFixed(1)}k <span style={{ color: colors.textMuted }}>({percentage.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}

                  <div className="pt-4 mt-2 space-y-2" style={{ borderTop: colors.borderBottom }}>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: colors.textMuted }}>Actual Expenses</span>
                      <span className="font-semibold" style={{ color: colors.text }}>${(totalSpent / 1000).toFixed(1)}k</span>
                    </div>
                    {hasSelections && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: colors.textMuted }}>+ Committed &amp; Approved</span>
                        <span className="font-semibold" style={{ color: colors.text }}>${((project.projectedSpend - totalSpent) / 1000).toFixed(1)}k</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: colors.textMuted }}>Budget</span>
                      <span className="font-semibold" style={{ color: colors.text }}>${(project.estimated_budget / 1000).toFixed(1)}k</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1" style={{ borderTop: colors.borderBottom }}>
                      <span className="font-medium" style={{ color: colors.text }}>Remaining</span>
                      <span className="font-bold" style={{ color: remaining < 0 ? '#DC2626' : '#16A34A' }}>
                        ${(Math.abs(remaining) / 1000).toFixed(1)}k {remaining < 0 ? 'over' : 'left'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3" style={{ color: darkMode ? '#374151' : '#D1D5DB' }} />
                  <p className="text-sm" style={{ color: colors.textMuted }}>No expenses recorded yet</p>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Expenses</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium capitalize">
                      {expense.category}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {expense.description || 'Untitled expense'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                    {expense.vendor && (
                      <>
                        <span>•</span>
                        <span>{expense.vendor}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className={`capitalize px-2 py-0.5 rounded ${
                      expense.payment_status === 'paid'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : expense.payment_status === 'overdue'
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {expense.payment_status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    ${expense.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
