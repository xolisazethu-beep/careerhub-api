import ListingsView from "@/components/ListingsView";
import {
  JOBS_API_BASE,
  toSummaryView,
  type ApplicationStat,
  type JobSummaryView,
} from "@/lib/jobs-api";
import type { JobListingResponse, PagedResponse } from "@/types";

/**
 * ListingsTable — the employer's listings data source (Assignment 2.2 Parts 4–6,
 * extended in 2.3 Part 7). An ASYNC SERVER COMPONENT that fetches BOTH data
 * sources IN PARALLEL with Promise.all, joins each job to its application count,
 * then hands the plain data to the CLIENT <ListingsView/>. It cannot read the
 * Zustand view store itself (an async Server Component has no client hooks), so
 * presentation (table vs. grid, show-closed filter) lives in ListingsView while
 * the fetching stays here. Still the slower Suspense boundary on the dashboard.
 */

/** Jobs fetch — cached + tagged "jobs" so the close action's revalidateTag
 * clears it. (Same tag as the candidate /jobs board, on purpose.) */
async function getJobs(): Promise<JobSummaryView[]> {
  const res = await fetch(`${JOBS_API_BASE}/api/jobs?page=1&pageSize=50`, {
    cache: "force-cache",
    next: { tags: ["jobs"] },
  });
  if (!res.ok) {
    throw new Error(`The jobs API responded ${res.status} ${res.statusText}`);
  }
  const payload = (await res.json()) as PagedResponse<JobListingResponse>;
  return payload.data.map(toSummaryView);
}

/** Stats fetch — no-store (always fresh, no clean invalidation trigger). */
async function getApplicationStats(): Promise<ApplicationStat[]> {
  const res = await fetch(`${JOBS_API_BASE}/api/applications/stats`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`The stats API responded ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ApplicationStat[];
}

/** Suspense fallback — five animate-pulse rows matching the table's row height. */
export function ListingsTableSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0 dark:border-slate-800/70"
        >
          <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-1/5 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-1/5 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="ml-auto h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export default async function ListingsTable() {
  // PARALLEL FETCH (Part 4): both requests start together, not one after the other.
  const [jobs, stats] = await Promise.all([getJobs(), getApplicationStats()]);

  // Join into a plain id→count map so the client view stays serializable.
  const counts: Record<string, number> = {};
  for (const s of stats) counts[s.jobId] = s.applicationCount;

  // Hand the data to the client view, which reads the Zustand store to decide
  // table vs. grid and whether to include closed listings.
  return <ListingsView jobs={jobs} counts={counts} />;
}
