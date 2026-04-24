export function CardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="h-4 bg-light-border dark:bg-dark-border rounded w-3/4 mb-4" />
          <div className="h-3 bg-light-border dark:bg-dark-border rounded w-1/2 mb-2" />
          <div className="h-3 bg-light-border dark:bg-dark-border rounded w-2/3 mb-4" />
          <div className="flex gap-2">
            <div className="h-6 bg-light-border dark:bg-dark-border rounded-full w-16" />
            <div className="h-6 bg-light-border dark:bg-dark-border rounded-full w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
