'use client'

/**
 * Photo Grid Skeleton - Loading state for FieldSnap photo grids
 */

export function PhotoCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-square bg-gray-200"></div>

      {/* Info section */}
      <div className="p-3">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="flex items-center gap-2">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  )
}

export function PhotoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PhotoCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function PhotoTimelineSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, dayIndex) => (
        <div key={dayIndex}>
          {/* Date header */}
          <div className="mb-4">
            <div className="h-6 bg-gray-200 rounded w-40 mb-1 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>

          {/* Photos for this day */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, photoIndex) => (
              <PhotoCardSkeleton key={photoIndex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PhotoDetailSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg animate-pulse">
      <div className="grid md:grid-cols-2 gap-6 p-6">
        {/* Image side */}
        <div>
          <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
          <div className="flex gap-2">
            <div className="h-20 w-20 bg-gray-200 rounded"></div>
            <div className="h-20 w-20 bg-gray-200 rounded"></div>
            <div className="h-20 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Details side */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>

          <div className="border-t pt-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
