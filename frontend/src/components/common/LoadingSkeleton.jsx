export function CardSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-[2.5rem] p-6 animate-pulse overflow-hidden">
          {/* Logo placeholder */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded-lg w-3/4" />
              <div className="h-3 skeleton rounded-lg w-1/2" />
            </div>
          </div>
          {/* Location */}
          <div className="h-3 skeleton rounded-lg w-2/5 mb-6" />
          {/* Badges */}
          <div className="flex gap-2 mb-6">
            <div className="h-7 skeleton rounded-xl w-20" />
            <div className="h-7 skeleton rounded-xl w-16" />
          </div>
          {/* Button */}
          <div className="h-11 skeleton rounded-xl w-full" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-6 animate-pulse flex gap-6">
          <div className="w-20 h-20 rounded-xl skeleton shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 skeleton rounded-lg w-1/2" />
            <div className="h-3 skeleton rounded-lg w-1/3" />
            <div className="flex gap-2 mt-2">
              <div className="h-6 skeleton rounded-xl w-16" />
              <div className="h-6 skeleton rounded-xl w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
