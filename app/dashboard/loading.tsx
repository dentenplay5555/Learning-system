export default function DashboardLoading() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="h-4 w-40 rounded-full bg-slate-800" />
        <div className="h-7 w-64 rounded-lg bg-slate-800" />
        <div className="h-3 w-80 rounded-full bg-slate-800/70" />
      </div>

      {/* Assignment cards skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-48 rounded-lg bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 rounded-lg bg-slate-800" />
                <div className="h-5 w-16 rounded-lg bg-slate-800" />
              </div>
              <div className="h-4 w-full rounded bg-slate-800" />
              <div className="h-3 w-3/4 rounded bg-slate-800/70" />
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-slate-800/70" />
                <div className="h-8 w-28 rounded-xl bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
