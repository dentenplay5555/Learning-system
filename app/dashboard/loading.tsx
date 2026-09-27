export default function DashboardLoading() {
  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-6 py-8 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-36 rounded skeleton-shimmer" />
        <div className="h-6 w-52 rounded skeleton-shimmer" />
        <div className="h-3 w-64 rounded skeleton-shimmer" />
      </div>

      {/* Assignment cards skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-40 rounded skeleton-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#1f2130] bg-[#161820] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-16 rounded skeleton-shimmer" />
                <div className="h-4 w-14 rounded skeleton-shimmer" />
              </div>
              <div className="h-4 w-full rounded skeleton-shimmer" />
              <div className="h-3 w-3/4 rounded skeleton-shimmer" />
              <div className="pt-3 border-t border-[#1f2130] flex items-center justify-between">
                <div className="h-3 w-20 rounded skeleton-shimmer" />
                <div className="h-7 w-20 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
