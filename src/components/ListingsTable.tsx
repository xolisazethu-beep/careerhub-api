import Link from "next/link";
import CloseJobButton from "@/components/CloseJobButton";
import {
  JOBS_API_BASE,
  toSummaryView,
  type ApplicationStat,
  type JobSummaryView,
} from "@/lib/jobs-api";
import type { JobListingResponse, PagedResponse } from "@/types";

/**
 * ListingsTable — the employer's data-dense listings table (Assignment 2.2,
 * Parts 4–6). An ASYNC SERVER COMPONENT that fetches BOTH its data sources
 * itself, IN PARALLEL with Promise.all (no props), then joins each job to its
 * application count. It is the SLOWER source (two fetches + a join), so it
 * resolves after ApplicationsSummary behind its own Suspense boundary.
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

  // Join: look up each job's application count by id, default 0 when absent.
  const countFor = (id: string) =>
    stats.find((s) => s.jobId === id)?.applicationCount ?? 0;

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
          No listings yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Once a role is posted it will appear here and on the public board.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Applications</th>
            <th className="px-4 py-3">View</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <td className="px-4 py-3 font-medium text-ink dark:text-slate-100">
                {job.title}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                {job.company}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                {job.location}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    job.status === "Closed"
                      ? "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      : "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                  }
                >
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-ink dark:text-slate-100">
                {countFor(job.id).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/jobs/${job.id}`}
                  className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                >
                  View
                </Link>
              </td>
              <td className="px-4 py-3 text-right">
                <CloseJobButton jobId={job.id} currentStatus={job.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
