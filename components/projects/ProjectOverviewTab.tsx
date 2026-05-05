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
  refreshKey?: number
}

export default function ProjectOverviewTab({ project, refreshKey = 0 }: Props) {
  const { colors, darkMode } = useThemeColors()
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(project.milestones)
  const [expenses, setExpenses] = useState(project.expenses)
  const [phaseTaskProgress, setPhaseTaskProgress] = useState<Record<string, { total: number; completed: number }>>({})

  useEffect(() => {
    const supabase = createClient()

    async function fetchLiveData() {
      const [milestonesRes, expensesRes, tasksRes] = await Promise.all([
        supabase.from('project_milestones').select('*').eq('project_id', project.id).order('due_date', { ascending: true }),
        supabase.from('project_expenses').select('*').eq('project_id', project.id).order('date', { ascending: false }),
        supabase.from('tasks').select('id, phase, status').eq('project_id', project.id),
      ])
      if (milestonesRes.data) setMilestones(milestonesRes.data as ProjectMilestone[])
      if (expensesRes.data) setExpenses(expensesRes.data as typeof project.expenses)
      if (tasksRes.data && project.phases.length > 0) {
        const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, '')
        const progress: Record<string, { total: number; completed: number }> = {}
        for (const task of tasksRes.data) {
          if (!task.phase) continue
          const phase = project.phases.find((p: any) => norm(p.name) === norm(task.phase))
          if (!phase) continue
          if (!progress[phase.id]) progress[phase.id] = { total: 0, completed: 0 }
          progress[phase.id].total++
          if (task.status === 'completed') progress[phase.id].completed++
        }
        setPhaseTaskProgress(progress)
      }
    }

    fetchLiveData()
  }, [project.id, refreshKey])

  function isMilestoneAtRisk(m: ProjectMilestone): boolean {
    if (m.status === 'completed' || m.status === 'cancelled') return false
    if (!m.phase_id) return false
    const prog = phaseTaskProgress[m.phase_id]
    if (!prog || prog.total === 0 || prog.completed === prog.total) return false
    const daysUntil = (new Date(m.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return daysUntil <= 14
  }

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

  // Use the live project.spent value (kept current by ProjectDetailClient via onSpentChange)
  // rather than summing the locally-fetched expenses, which may lag after Budget tab mutations.
  const totalSpent = project.spent

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
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.card, border: colors.border }}>
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
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.card, border: colors.border }}>
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
        <div className="rounded-lg p-4" style={{ backgroundColor: colors.card, border: colors.border }}>
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
                style={{ backgroundColor: '#6B7280', border: `2px solid ${colors.card}` }}
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
                style={{ backgroundColor: colors.bgMuted, border: `2px solid ${colors.card}`, color: colors.textMuted }}
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
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.card, border: colors.border }}>
          <div className="px-5 py-4" style={{ borderBottom: colors.borderBottom }}>
            <h2 className="text-base font-semibold" style={{ color: colors.text }}>Upcoming Milestones</h2>
          </div>

          {upcomingMilestones.length > 0 ? (() => {
            const [next, ...rest] = upcomingMilestones
            return (
              <div className="divide-y" style={{ borderColor: darkMode ? '#1f2937' : '#f3f4f6' }}>
                {/* Next milestone — featured */}
                {(() => {
                  const dueDate = new Date(next.due_date)
                  const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const overdue = daysUntil < 0
                  const atRisk = isMilestoneAtRisk(next)
                  const prog = next.phase_id ? phaseTaskProgress[next.phase_id] : null
                  const pct = prog && prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : null
                  const trackBg = darkMode ? '#374151' : '#E5E7EB'
                  return (
                    <div className="px-5 py-4" style={{ backgroundColor: darkMode ? 'rgba(37,99,235,0.08)' : 'rgba(239,246,255,0.8)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2563EB' }}>Next Milestone</span>
                            {atRisk && (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: darkMode ? 'rgba(245,158,11,0.15)' : '#FFFBEB', color: '#D97706' }}>
                                At Risk
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>{next.name}</p>
                          {next.description && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: colors.textMuted }}>{next.description}</p>
                          )}
                          {pct !== null && prog && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs" style={{ color: colors.textMuted }}>
                                <span>{prog.completed}/{prog.total} tasks</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16A34A' : '#2563EB' }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : daysUntil <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>
                            {overdue ? <><AlertTriangle className="h-3 w-3" />{Math.abs(daysUntil)}d overdue</>
                              : daysUntil === 0 ? 'Due today'
                              : `${daysUntil} days`}
                          </span>
                          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{format(dueDate, 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Remaining milestones */}
                {rest.map(milestone => {
                  const dueDate = new Date(milestone.due_date)
                  const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const overdue = daysUntil < 0
                  const atRisk = isMilestoneAtRisk(milestone)
                  const prog = milestone.phase_id ? phaseTaskProgress[milestone.phase_id] : null
                  const pct = prog && prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : null
                  const trackBg = darkMode ? '#374151' : '#E5E7EB'
                  return (
                    <div key={milestone.id} className="px-5 py-3.5" style={{ borderColor: darkMode ? '#1f2937' : '#f3f4f6' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{milestone.name}</p>
                            {atRisk && (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: darkMode ? 'rgba(245,158,11,0.15)' : '#FFFBEB', color: '#D97706' }}>
                                At Risk
                              </span>
                            )}
                          </div>
                          {pct !== null && prog && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: trackBg, maxWidth: '100px' }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16A34A' : '#2563EB' }} />
                              </div>
                              <span className="text-xs" style={{ color: colors.textMuted }}>{prog.completed}/{prog.total}</span>
                            </div>
                          )}
                        </div>
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          : daysUntil <= 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {overdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })() : (
            <div className="p-8 text-center" style={{ color: colors.textMuted }}>
              <Calendar className="h-10 w-10 mx-auto mb-3" style={{ color: darkMode ? '#374151' : '#D1D5DB' }} />
              <p className="text-sm">No upcoming milestones</p>
            </div>
          )}
        </div>

        {/* Budget Breakdown */}
        <div className="rounded-lg" style={{ backgroundColor: colors.card, border: colors.border }}>
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
