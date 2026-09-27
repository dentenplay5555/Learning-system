export default function AssignmentDetailLoading() {
  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header skeleton */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="h-4 w-32 rounded-full skeleton-shimmer" />
        <div className="h-8 w-72 rounded-lg skeleton-shimmer" />
        <div className="h-3.5 w-60 rounded-full skeleton-shimmer" />
      </div>

      {/* Questions skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="h-5 w-48 rounded-lg skeleton-shimmer" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-12 w-full rounded-xl skeleton-shimmer opacity-70" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
