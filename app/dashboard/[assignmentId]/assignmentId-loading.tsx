export default function AssignmentDetailLoading() {
  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="h-3 w-32 rounded-full bg-slate-800" />
        <div className="h-7 w-72 rounded-lg bg-slate-800" />
        <div className="h-3 w-56 rounded-full bg-slate-800/70" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-10 w-full rounded-xl bg-slate-800/60" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
