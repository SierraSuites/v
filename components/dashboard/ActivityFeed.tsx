'use client'

import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface Activity {
  id: string
  action: string
  entity_type: string
  entity_id: string
  entity_name?: string
  metadata: any
  created_at: string
  user_id: string | null
  user_profiles?: { full_name: string } | null
}

interface ActivityFeedProps {
  activities: Activity[]
}

function getActivityIcon(action: string, entity_type: string) {
  if (action === 'completed') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (action === 'created') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (entity_type === 'project') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  }
  // task / default
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function getIconStyle(action: string, darkMode: boolean): { bg: string; color: string } {
  switch (action) {
    case 'created':  return { bg: darkMode ? 'rgba(34,197,94,0.15)'  : '#DCFCE7', color: '#16A34A' }
    case 'updated':  return { bg: darkMode ? 'rgba(59,130,246,0.15)' : '#DBEAFE', color: '#2563EB' }
    case 'completed':return { bg: darkMode ? 'rgba(168,85,247,0.15)' : '#F3E8FF', color: '#9333EA' }
    case 'deleted':  return { bg: darkMode ? 'rgba(239,68,68,0.15)'  : '#FEE2E2', color: '#DC2626' }
    default:         return { bg: darkMode ? 'rgba(107,114,128,0.15)': '#F3F4F6', color: '#6B7280' }
  }
}

function formatMessage(activity: Activity): string {
  const name = activity.entity_name || activity.entity_id
  const type = activity.entity_type === 'project' ? 'Project' : 'Task'
  const status = activity.metadata?.status

  switch (activity.action) {
    case 'created':   return `${type} "${name}" was created`
    case 'completed': return `Task "${name}" was completed`
    case 'updated': {
      if (status) return `${type} "${name}" is now ${status.replace(/-/g, ' ')}`
      return `${type} "${name}" was updated`
    }
    default: return `${type} "${name}" ${activity.action}`
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const { colors, darkMode } = useThemeColors()

  return (
    <div
      className="rounded-lg shadow p-6"
      style={{
        backgroundColor: colors.bg,
        border: colors.border,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
      }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Recent Activity</h2>

      <div className="space-y-1">
        {activities.length === 0 ? (
          <div className="text-center py-8" style={{ color: colors.textMuted }}>
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => {
            const iconStyle = getIconStyle(activity.action, darkMode)
            return (
              <div
                key={activity.id}
                className="flex gap-3 p-2.5 rounded-lg transition-colors"
                style={{ ':hover': { backgroundColor: colors.bgAlt } } as any}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.bgAlt)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: iconStyle.bg, color: iconStyle.color }}
                >
                  {getActivityIcon(activity.action, activity.entity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: colors.text }}>
                    {formatMessage(activity)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    {formatTime(activity.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
