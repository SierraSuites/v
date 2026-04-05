'use client'

/**
 * Dashboard Skeleton - Loading state for dashboard widgets
 */

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
      </div>
    </div>
  )
}

export function WelcomeBannerSkeleton() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-8 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-8 bg-blue-500 rounded w-64"></div>
          <div className="h-4 bg-blue-500 rounded w-96"></div>
          <div className="flex gap-3 mt-4">
            <div className="h-10 bg-blue-500 rounded w-32"></div>
            <div className="h-10 bg-blue-500 rounded w-32"></div>
            <div className="h-10 bg-blue-500 rounded w-32"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartWidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded w-40"></div>
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
      </div>

      {/* Chart bars */}
      <div className="flex items-end justify-between h-48 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-t w-full"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          ></div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded w-8"></div>
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <WelcomeBannerSkeleton />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <ChartWidgetSkeleton />
            <ActivityFeedSkeleton />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
