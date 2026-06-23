/**
 * /jobs loading skeleton (Assignment 2.1).
 *
 * Next renders this AUTOMATICALLY — it wraps the route's Server Component in a
 * <Suspense> boundary whose fallback is this file. So while the server is still
 * awaiting the jobs fetch, the browser already has this skeleton painted; the
 * moment the data resolves, Next streams the real grid in to replace it. There
 * is no `isPending` flag and no client state — Suspense drives the swap.
 *
 * The placeholders mirror the real grid: same 3-column layout, same card
 * footprint, one per expected card (12, matching PAGE_SIZE in page.tsx) so the
 * layout does not jump when content arrives.
 */

const SKELETON_COUNT = 12;

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className ?? ""}`}
    />
  );
}

export default function JobsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <Bar className="h-9 w-48" />
        <Bar className="mt-3 h-4 w-80 max-w-full" />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <Bar className="h-5 w-20" />
              <Bar className="h-5 w-14" />
            </div>
            <Bar className="mt-4 h-5 w-3/4" />
            <Bar className="mt-3 h-4 w-1/2" />
            <Bar className="mt-2 h-4 w-2/5" />
            <Bar className="mt-auto h-4 w-24 pt-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
