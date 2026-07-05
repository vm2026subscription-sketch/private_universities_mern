export function CardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton w-3/4" />
              <div className="h-3 skeleton w-1/2" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-6 skeleton w-20" />
            <div className="h-6 skeleton w-16" />
          </div>
          <div className="h-10 skeleton w-full" />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-6 flex gap-6">
          <div className="w-20 h-20 skeleton shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 skeleton w-1/2" />
            <div className="h-3 skeleton w-1/3" />
            <div className="flex gap-2">
              <div className="h-6 skeleton w-16" />
              <div className="h-6 skeleton w-20" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-container px-4 py-8 space-y-8" role="status" aria-busy="true">
      <div className="h-8 skeleton w-48" />
      <div className="h-4 skeleton w-64" />
      <CardSkeleton count={6} />
    </div>
  );
}
