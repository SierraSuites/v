'use client'

interface Activity {
  id: number
  type: string
  message: string
  time: string
  icon: string
}

interface ActivityFeedProps {
  activities: Activity[]
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
