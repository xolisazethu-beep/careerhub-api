/**
 * /jobs loading skeleton (Assignment 2.1 → 3.1 Part 5).
 *
 * Next renders this AUTOMATICALLY — it wraps the route's Server Component in a
 * <Suspense> boundary whose fallback is this file. So while the server is still
 * awaiting the jobs fetch, the browser already has this skeleton painted; the
 * moment the data resolves, Next streams the real grid in to replace it.
 *
 * Part 5: the grid uses the PAIRED `JobCardSkeleton` (it mirrors `JobCard`
 * region-for-region, so dimensions match and the swap-in causes no layout
 * shift) and shows exactly 6 cards — see the README for why 6.
 */

import { JobListSkeleton } from "@/components/JobCardSkeleton";

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

      {/* Six skeleton cards, paired with JobCard for matching dimensions. */}
      <JobListSkeleton />
    </div>
  );
}
