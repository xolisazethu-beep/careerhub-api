import { Users } from "lucide-react";
import { JOBS_API_BASE, type ApplicationStat } from "@/lib/jobs-api";

/**
 * ApplicationsSummary — the dashboard's "Total Applications" stat card
 * (Assignment 2.2, Part 5). An ASYNC SERVER COMPONENT: it fetches its OWN stats
 * (no props), so it is fully self-contained and can sit behind its own Suspense
 * boundary. It is the FAST source — one small fetch, no join — so it resolves
 * and replaces its skeleton before the heavier ListingsTable does.
 */

/** Fetches application stats. `no-store`: applications change at any time and
 * have no clean employer-triggered invalidation, so always-fresh is correct. */
async function getApplicationStats(): Promise<ApplicationStat[]> {
  const res = await fetch(`${JOBS_API_BASE}/api/applications/stats`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`The stats API responded ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ApplicationStat[];
}

/** Suspense fallback — an animate-pulse block matching the real card's footprint. */
export function ApplicationsSummarySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mb-8 flex animate-pulse items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export default async function ApplicationsSummary() {
  const stats = await getApplicationStats();
  const total = stats.reduce((sum, s) => sum + s.applicationCount, 0);

  return (
    <div className="mb-8 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
        <Users className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Total Applications
        </p>
        <p className="font-display text-3xl font-extrabold leading-tight text-ink dark:text-slate-100">
          {total.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
