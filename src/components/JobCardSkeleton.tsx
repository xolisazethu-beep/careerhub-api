/**
 * Loading placeholders for the job grid.
 *
 * `JobCardSkeleton` mirrors the visual structure of `JobCard` region-for-region
 * — header/badge row, title, company line, salary line, closing line, footer —
 * so the skeleton occupies the same footprint the real card will. When data
 * arrives the layout does not jump (no cumulative layout shift); the grey
 * blocks are simply replaced by content of the same size.
 *
 * No real text is rendered — every region is a pulsing grey bar. Each bar
 * carries both a light (`bg-slate-200`) and dark (`dark:bg-slate-700/800`)
 * background so it reads correctly in either theme.
 */

/** A single pulsing placeholder bar. */
function Bar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className ?? ""}`}
    />
  );
}

export function JobCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Badge area + bookmark */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <Bar className="h-5 w-20" />
        </div>
        <Bar className="h-6 w-6 rounded-lg" />
      </div>

      {/* Title */}
      <Bar className="mt-4 h-5 w-3/4" />

      {/* Company · location */}
      <Bar className="mt-2 h-4 w-1/2" />

      {/* Salary */}
      <Bar className="mt-4 h-4 w-2/5" />

      {/* Closing date line */}
      <Bar className="mt-2 h-3 w-1/3" />

      {/* Footer: posted · applicants */}
      <div className="mt-auto flex items-center gap-3 pt-6">
        <Bar className="h-3 w-24" />
        <Bar className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Six skeleton cards in the exact grid `JobList` uses
 * (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Six matches a realistic first
 * page of results and keeps the loading frame the same height as the loaded one.
 */
export function JobListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default JobCardSkeleton;
