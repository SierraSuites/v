'use client'

/**
 * Project Card Skeleton - Loading state for project cards
 *
 * Provides better UX than spinners by showing content-aware placeholders
 */

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
      </div>

      {/* Progress section */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="h-2 bg-gray-200 rounded w-full"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div>
          <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex -space-x-2">
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  )
}

export function ProjectCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProjectCardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  )
}
