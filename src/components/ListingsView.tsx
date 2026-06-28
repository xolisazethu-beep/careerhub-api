"use client";

import Link from "next/link";
import CloseJobButton from "@/components/CloseJobButton";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { JobSummaryView } from "@/lib/jobs-api";

/**
 * ListingsView — the CLIENT half of the dashboard listings (Assignment 2.3,
 * Part 7). Its async Server Component parent (ListingsTable) fetches jobs +
 * application counts and passes them in as plain props; this component reads the
 * Zustand store (view, showClosedJobs) and renders table OR grid accordingly.
 *
 * This is the store ↔ Server Component bridge: an async Server Component can't
 * call `useStore` (hooks are client-only and the server has no subscription to
 * client state), so the server does the fetching and hands the DATA down, while
 * this client leaf owns the store-driven PRESENTATION.
 */
export default function ListingsView({
  jobs,
  counts,
}: {
  jobs: JobSummaryView[];
  counts: Record<string, number>;
}) {
  const view = useDashboardStore((s) => s.view);
  const showClosedJobs = useDashboardStore((s) => s.showClosedJobs);

  const visible = showClosedJobs
    ? jobs
    : jobs.filter((j) => j.status !== "Closed");

  const countFor = (id: string) => counts[id] ?? 0;

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
          {jobs.length === 0 ? "No listings yet" : "No listings to show"}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {jobs.length === 0
            ? "Once a role is posted it will appear here and on the public board."
            : "Closed listings are hidden — tick “Show closed jobs” to see them."}
        </p>
      </div>
    );
  }

  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((job) => (
          <div
            key={job.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-bold text-ink dark:text-slate-100">
                {job.title}
              </h3>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {job.company}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {job.location}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-ink dark:text-slate-100">
                  {countFor(job.id).toLocaleString()}
                </span>{" "}
                applications
              </span>
              <div className="flex items-center gap-3">
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                >
                  View
                </Link>
                <CloseJobButton jobId={job.id} currentStatus={job.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Table view (default).
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
          {visible.map((job) => (
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
                <StatusBadge status={job.status} />
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        status === "Closed"
          ? "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          : "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
      }
    >
      {status}
    </span>
  );
}
