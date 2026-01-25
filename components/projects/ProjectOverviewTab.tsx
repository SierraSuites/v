'use client'

// ============================================================================
// PROJECT OVERVIEW TAB
// Summary of project information, recent activity, and key metrics
// ============================================================================

import { ProjectDetails } from '@/lib/projects/get-project-details'
import { Calendar, Clock, TrendingUp, FileText, Users, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  project: ProjectDetails
}

export default function ProjectOverviewTab({ project }: Props) {
  // Calculate completion percentage by milestone
  const completedMilestones = project.milestones.filter(m => m.status === 'completed').length
  const totalMilestones = project.milestones.length
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  // Get upcoming milestones
  const upcomingMilestones = project.milestones
    .filter(m => m.status !== 'completed' && m.status !== 'cancelled')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)

  // Get recent expenses
  const recentExpenses = [...project.expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  // Calculate expense breakdown
  const expensesByCategory = project.expenses.reduce((acc, expense) => {
    const category = expense.category || 'other'
    acc[category] = (acc[category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const topCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Project Description */}
      {project.description && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Project Description</h2>
          <p className="text-gray-700 leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Milestones Progress */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Milestones</div>
              <div className="text-2xl font-bold text-gray-900">
                {completedMilestones} / {totalMilestones}
              </div>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-2">{milestoneProgress.toFixed(0)}% complete</div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Documents</div>
              <div className="text-2xl font-bold text-gray-900">{project.documents.length}</div>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            {project.documents.filter(d => d.category === 'blueprint').length} blueprints,{' '}
            {project.documents.filter(d => d.category === 'contract').length} contracts
          </div>
        </div>

        {/* Team Size */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Team Members</div>
              <div className="text-2xl font-bold text-gray-900">{project.teamMembers.length}</div>
            </div>
          </div>
          <div className="flex -space-x-2">
            {project.teamMembers.slice(0, 5).map((member, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                title={member.name}
              >
                {member.avatar ? (
                  <img src={member.avatar} className="w-full h-full rounded-full object-cover" alt={member.name} />
                ) : (
                  <span>{member.name.charAt(0)}</span>
                )}
              </div>
            ))}
            {project.teamMembers.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                +{project.teamMembers.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Milestones */}
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Milestones</h2>
          </div>
          <div className="divide-y">
            {upcomingMilestones.length > 0 ? (
              upcomingMilestones.map((milestone) => {
                const dueDate = new Date(milestone.due_date)
                const today = new Date()
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const isOverdue = daysUntil < 0

                return (
                  <div key={milestone.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{milestone.name}</h3>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{format(dueDate, 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isOverdue
                              ? 'bg-red-100 text-red-800'
                              : daysUntil < 7
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-700'
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
              <div className="p-8 text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No upcoming milestones</p>
              </div>
            )}
          </div>
        </div>

        {/* Budget Breakdown */}
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Budget Breakdown</h2>
          </div>
          <div className="p-6">
            {topCategories.length > 0 ? (
              <div className="space-y-4">
                {topCategories.map(([category, amount]) => {
                  const percentage = (amount / project.spent) * 100
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {category}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${(amount / 1000).toFixed(1)}k ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                <div className="pt-4 border-t mt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Spent:</span>
                    <span className="font-bold text-gray-900">${(project.spent / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Estimated Budget:</span>
                    <span className="font-semibold text-gray-700">${(project.estimated_budget / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Remaining:</span>
                    <span className={`font-semibold ${project.budgetRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${(Math.abs(project.budgetRemaining) / 1000).toFixed(1)}k {project.budgetRemaining < 0 ? 'over' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No expenses recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      {recentExpenses.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
          </div>
          <div className="divide-y">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium capitalize">
                      {expense.category}
                    </span>
                    <span className="text-sm text-gray-900 font-medium">
                      {expense.description || 'Untitled expense'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                    {expense.vendor && (
                      <>
                        <span>•</span>
                        <span>{expense.vendor}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className={`capitalize px-2 py-0.5 rounded ${
                      expense.payment_status === 'paid' ? 'bg-green-50 text-green-700' :
                      expense.payment_status === 'overdue' ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      {expense.payment_status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
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
