/**
 * /dashboard/listings loading skeleton.
 *
 * Streamed via Suspense while the server awaits the listings fetch — so even on a
 * cold backend the employer immediately sees a table-shaped placeholder instead
 * of a blank, hanging page. Mirrors the real table's columns and row rhythm.
 */
function Bar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className ?? ""}`}
    />
  );
}

export default function DashboardListingsLoading() {
  return (
    <section>
      <header className="mb-6">
        <Bar className="h-7 w-40" />
        <Bar className="mt-2 h-4 w-24" />
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Bar className="h-4 w-full max-w-md" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800/70"
          >
            <Bar className="h-4 w-1/4" />
            <Bar className="h-4 w-1/5" />
            <Bar className="h-4 w-1/5" />
            <Bar className="h-4 w-16" />
            <Bar className="ml-auto h-4 w-12" />
          </div>
        ))}
      </div>
    </section>
  );
}
