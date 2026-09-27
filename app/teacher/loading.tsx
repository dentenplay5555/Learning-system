export default function TeacherDashboardLoading() {
  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-6 py-8 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-32 rounded skeleton-shimmer" />
        <div className="h-6 w-48 rounded skeleton-shimmer" />
        <div className="h-3 w-56 rounded skeleton-shimmer" />
      </div>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#1f2130] bg-[#161820] p-4 space-y-2">
            <div className="h-3 w-20 rounded skeleton-shimmer" />
            <div className="h-6 w-16 rounded skeleton-shimmer" />
            <div className="h-2.5 w-24 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-[#1f2130] bg-[#161820] p-5 sm:p-6 space-y-4">
        <div className="h-4 w-40 rounded skeleton-shimmer" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}
