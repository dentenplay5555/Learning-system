export default function TeacherDashboardLoading() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-3xl p-6 sm:p-8">
        <div className="space-y-3">
          <div className="h-4 w-48 rounded-full bg-slate-800" />
          <div className="h-7 w-56 rounded-lg bg-slate-800" />
          <div className="h-3 w-72 rounded-full bg-slate-800/70" />
        </div>
        <div className="h-11 w-44 rounded-2xl bg-slate-800" />
      </div>

      {/* Metrics row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl space-y-2">
            <div className="h-3 w-24 rounded bg-slate-800" />
            <div className="h-6 w-16 rounded bg-slate-800" />
            <div className="h-2.5 w-20 rounded bg-slate-800/70" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="h-5 w-56 rounded-lg bg-slate-800" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-xl bg-slate-800/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
