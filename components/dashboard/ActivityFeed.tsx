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

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '➕'
      case 'updated':
        return '📝'
      case 'deleted':
        return '🗑️'
      default:
        return '📌'
    }
  }
  const { colors, darkMode } = useThemeColors()

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

  return (
    <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Recent Activity</h2>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8" style={{ color: colors.textMuted }}>
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                {getActivityIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{formatActivityMessage(activity)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatTime(activity.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
