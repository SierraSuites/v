'use client'

// ============================================================================
// PROJECT HEADER COMPONENT
// Displays project title, status, progress, and key metrics
// ============================================================================

import { useState, useEffect } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { Calendar, DollarSign, TrendingUp, MapPin, AlertCircle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import EditProjectModal from './EditProjectModal'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
interface Props {
  project: ProjectDetails
}

export default function ProjectHeader({ project }: Props) {
  const pathname = usePathname()
  const { colors } = useThemeColors()
  const [showEdit, setShowEdit] = useState(false)
  const [liveProgress, setLiveProgress] = useState(project.progress ?? 0)

  // Build breadcrumb crumbs from pathname
  const rawSegs = pathname.split('/').filter(Boolean)
  const crumbs = [
    { href: '/dashboard', label: 'Dashboard', isLast: false },
    ...rawSegs.map((seg, i) => ({
      href: '/' + rawSegs.slice(0, i + 1).join('/'),
      label: UUID_RE.test(seg)
        ? project.name
        : (SEGMENT_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
      isLast: i === rawSegs.length - 1,
    })),
  ]

  useEffect(() => {
    const handler = (e: Event) => setLiveProgress((e as CustomEvent).detail.progress)
    window.addEventListener('project-progress-update', handler)
    return () => window.removeEventListener('project-progress-update', handler)
  }, [])
  // Status colors
  const statusColors = {
    planning: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    'on-hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  }

  // Calculate days elapsed
  const startDate = new Date(project.start_date)
  const endDate = new Date(project.end_date)
  const today = new Date()
  const totalDays = differenceInDays(endDate, startDate)
  const elapsedDays = differenceInDays(today, startDate)
  const timeProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))

  return (
    <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-4">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <span style={{ color: colors.textMuted }}>/</span>}
              {crumb.isLast
                ? <span className="font-medium" style={{ color: colors.text }}>{crumb.label}</span>
                : <Link href={crumb.href} className="hover:underline" style={{ color: colors.textMuted }}>{crumb.label}</Link>
              }
            </span>
          ))}
        </nav>

        {/* Title Row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
                {project.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>

            {/* Client & Location */}
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
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
            <button
              onClick={() => setShowEdit(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Edit Project
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Progress */}
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Progress"
            value={`${liveProgress}%`}
            color="blue"
          >
            <div className="mt-2">
              <div className="w-full h-2 bg-[#E5E7EB] dark:bg-[#374151] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${liveProgress}%` }}
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
              <div className="w-full h-2 bg-[#E5E7EB] dark:bg-[#374151] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    project.daysRemaining < 0 ? 'bg-red-600' :
                    project.daysRemaining < 7 ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(100, timeProgress)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{format(startDate, 'MMM d, yyyy')}</span>
                <span>{format(endDate, 'MMM d, yyyy')}</span>
              </div>
            </div>
          </MetricCard>

          {/* Budget */}
          {(() => {
            const hasSelections = project.designSelectionsSummary.length > 0
            const displaySpend = hasSelections ? project.projectedSpend : project.spent
            const displayPct = hasSelections ? project.projectedPercentage : project.budgetPercentage
            const isOver = displayPct > 100
            const remaining = project.estimated_budget - displaySpend
            return (
              <MetricCard
                icon={<DollarSign className="h-5 w-5" />}
                label={hasSelections ? 'Projected Budget' : 'Budget'}
                value={`$${(displaySpend / 1000).toFixed(1)}k / $${(project.estimated_budget / 1000).toFixed(1)}k`}
                color={isOver ? 'red' : displayPct > 90 ? 'yellow' : 'green'}
              >
                <div className="mt-2">
                  <div className="w-full h-2 bg-[#E5E7EB] dark:bg-[#374151] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? 'bg-red-600' : displayPct > 90 ? 'bg-yellow-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(100, displayPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{displayPct.toFixed(0)}% {hasSelections ? 'projected' : 'used'}</span>
                    <span className={remaining < 0 ? 'text-red-600 font-medium' : ''}>
                      ${(Math.abs(remaining) / 1000).toFixed(1)}k {remaining < 0 ? 'over' : 'left'}
                    </span>
                  </div>
                </div>
              </MetricCard>
            )
          })()}

          {/* Team */}
          <MetricCard
            icon={<div className="flex -space-x-2">
              {project.teamMembers.slice(0, 3).map((member, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-[#D1D5DB] dark:bg-[#4B5563] border-2 border-white flex items-center justify-center text-xs font-medium"
                >
                  {member.avatar ? (
                    <img src={member.avatar} className="w-full h-full rounded-full object-cover" alt={member.name} />
                  ) : (
                    <span>{member.name.charAt(0)}</span>
                  )}
                </div>
              ))}
              {project.teamMembers.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-[#9CA3AF] dark:bg-[#6B7280] border-2 border-white flex items-center justify-center text-xs font-medium text-white">
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
        {(() => {
          const hasSelections = project.designSelectionsSummary.length > 0
          const effectiveSpend = hasSelections ? project.projectedSpend : project.spent
          const isEffectivelyOverBudget = effectiveSpend > project.estimated_budget
          const overAmount = effectiveSpend - project.estimated_budget
          return (isEffectivelyOverBudget || project.isOverdue) && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">Action Required</h3>
                <ul className="text-sm text-red-800 dark:text-red-400 space-y-1">
                  {isEffectivelyOverBudget && (
                    <li>• Project is {hasSelections ? 'projected to be' : ''} over budget by ${(Math.abs(overAmount) / 1000).toFixed(1)}k</li>
                  )}
                  {project.isOverdue && (
                    <li>• Project is {Math.abs(project.daysRemaining)} days overdue</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )
        })()}
      </div>

      {showEdit && (
        <EditProjectModal project={project} onClose={() => setShowEdit(false)} />
      )}

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
    <div className="bg-white dark:bg-[#252a3a] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</div>
        </div>
      </div>
      {children}
    </div>
  )
}
