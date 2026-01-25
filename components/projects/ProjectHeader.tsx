'use client'

// ============================================================================
// PROJECT HEADER COMPONENT
// Displays project title, status, progress, and key metrics
// ============================================================================

import { ProjectDetails } from '@/lib/projects/get-project-details'
import { Calendar, DollarSign, TrendingUp, MapPin, AlertCircle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface Props {
  project: ProjectDetails
}

export default function ProjectHeader({ project }: Props) {
  // Status colors
  const statusColors = {
    planning: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  // Calculate days elapsed
  const startDate = new Date(project.start_date)
  const endDate = new Date(project.end_date)
  const today = new Date()
  const totalDays = differenceInDays(endDate, startDate)
  const elapsedDays = differenceInDays(today, startDate)
  const timeProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Title Row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
                {project.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>

            {/* Client & Location */}
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-1">
                <span className="font-medium">Client:</span>
                <span>{project.client}</span>
              </div>
              {project.address && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{project.address}</span>
                    {project.city && project.state && (
                      <span>, {project.city}, {project.state}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
              Edit Project
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              + Add Task
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Progress */}
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Progress"
            value={`${project.progress}%`}
            color="blue"
          >
            <div className="mt-2">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </MetricCard>

          {/* Timeline */}
          <MetricCard
            icon={<Calendar className="h-5 w-5" />}
            label="Timeline"
            value={`${Math.abs(project.daysRemaining)} days ${project.daysRemaining >= 0 ? 'left' : 'overdue'}`}
            color={project.daysRemaining < 0 ? 'red' : project.daysRemaining < 7 ? 'yellow' : 'green'}
          >
            <div className="mt-2">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    project.daysRemaining < 0 ? 'bg-red-600' :
                    project.daysRemaining < 7 ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(100, timeProgress)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{format(startDate, 'MMM d, yyyy')}</span>
                <span>{format(endDate, 'MMM d, yyyy')}</span>
              </div>
            </div>
          </MetricCard>

          {/* Budget */}
          <MetricCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Budget"
            value={`$${(project.spent / 1000).toFixed(1)}k / $${(project.estimated_budget / 1000).toFixed(1)}k`}
            color={project.isOverBudget ? 'red' : project.budgetPercentage > 90 ? 'yellow' : 'green'}
          >
            <div className="mt-2">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    project.isOverBudget ? 'bg-red-600' :
                    project.budgetPercentage > 90 ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(100, project.budgetPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{project.budgetPercentage.toFixed(0)}% used</span>
                <span className={project.budgetRemaining < 0 ? 'text-red-600 font-medium' : ''}>
                  ${(Math.abs(project.budgetRemaining) / 1000).toFixed(1)}k {project.budgetRemaining < 0 ? 'over' : 'left'}
                </span>
              </div>
            </div>
          </MetricCard>

          {/* Team */}
          <MetricCard
            icon={<div className="flex -space-x-2">
              {project.teamMembers.slice(0, 3).map((member, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                >
                  {member.avatar ? (
                    <img src={member.avatar} className="w-full h-full rounded-full object-cover" alt={member.name} />
                  ) : (
                    <span>{member.name.charAt(0)}</span>
                  )}
                </div>
              ))}
              {project.teamMembers.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                  +{project.teamMembers.length - 3}
                </div>
              )}
            </div>}
            label="Team Members"
            value={`${project.teamMembers.length} active`}
            color="blue"
          />
        </div>

        {/* Alerts */}
        {(project.isOverBudget || project.isOverdue) && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-red-900 mb-1">Action Required</h3>
                <ul className="text-sm text-red-800 space-y-1">
                  {project.isOverBudget && (
                    <li>• Project is over budget by ${(Math.abs(project.budgetRemaining) / 1000).toFixed(1)}k</li>
                  )}
                  {project.isOverdue && (
                    <li>• Project is {Math.abs(project.daysRemaining)} days overdue</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Reusable Metric Card
interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'green' | 'yellow' | 'red'
  children?: React.ReactNode
}

function MetricCard({ icon, label, value, color, children }: MetricCardProps) {
  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600'
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-gray-600">{label}</div>
          <div className="text-lg font-bold text-gray-900">{value}</div>
        </div>
      </div>
      {children}
    </div>
  )
}
