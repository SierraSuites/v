import { Skeleton } from "@/components/ui/skeleton"

export function LoadingCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-full mt-4" />
      </div>
    </div>
  )
}

export function LoadingStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

export function LoadingWidget({ cols = 6 }: { cols?: number }) {
  return (
    <div className={`lg:col-span-${cols} bg-card border border-border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
