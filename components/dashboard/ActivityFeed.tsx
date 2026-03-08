'use client'

import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface Activity {
  id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: any
  created_at: string
  user_id: string
  user_profiles?: {
    full_name: string
  }
}

interface ActivityFeedProps {
  activities: Activity[]
}

// Quality Guide lines 680-686: SVG icons instead of emojis
function getActivityIcon(action: string) {
  switch (action) {
    case 'created':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'updated':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    case 'deleted':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    case 'completed':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

// Quality Guide lines 689-698: Color-coded backgrounds per action type
function getActivityColor(action: string) {
  const colors: Record<string, string> = {
    created: 'bg-green-100 text-green-600',
    updated: 'bg-blue-100 text-blue-600',
    deleted: 'bg-red-100 text-red-600',
    completed: 'bg-purple-100 text-purple-600',
  }
  return colors[action] || 'bg-gray-100 text-gray-600'
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
        return getActivityIcon(action)
      case 'updated':
        return getActivityIcon(action)
      case 'deleted':
        return getActivityIcon(action)
      default:
        return getActivityIcon(action)
    }
  }
  const formatActivityMessage = (activity: Activity) => {
    const user = activity.user_profiles?.full_name || 'Someone'
    return `${user} ${activity.action} ${activity.entity_type}`
  }

  const formatTime = (dateString: string) => {
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
  const { colors, darkMode } = useThemeColors()

  return (
    <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Recent Activity</h2>

      <div className="space-y-1">
        {activities.length === 0 ? (
          <div className="text-center py-8" style={{ color: colors.textMuted }}>
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Quality Guide line 636-641: Colored icon circle */}
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.action)}`}>
                {getActivityIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {formatActivityMessage(activity)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.user_profiles?.full_name || 'Someone'} &bull; {formatTime(activity.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
