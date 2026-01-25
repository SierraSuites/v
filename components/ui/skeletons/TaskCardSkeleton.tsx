'use client'

/**
 * Task Card Skeleton - Loading state for task cards
 */

export function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      {/* Header with priority badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
        <div className="h-5 w-24 bg-gray-200 rounded-full"></div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  )
}

export function TaskKanbanColumnSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 min-w-[300px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded w-32"></div>
        <div className="h-6 w-8 bg-gray-200 rounded-full"></div>
      </div>

      {/* Task cards */}
      <div className="space-y-3">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  )
}

export function TaskKanbanBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <TaskKanbanColumnSkeleton />
      <TaskKanbanColumnSkeleton />
      <TaskKanbanColumnSkeleton />
      <TaskKanbanColumnSkeleton />
    </div>
  )
}

export function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  )
}
