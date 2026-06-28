"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJobById } from "@/lib/api";
import { useJobStore } from "@/stores/jobStore";
import { useDeleteJob } from "@/components/explore/useDeleteJob";
import {
  EmploymentTypeBadge,
  ActiveStatusBadge,
} from "@/components/JobStatusBadge";
import {
  formatSalaryRange,
  formatRelativeDate,
  formatClosingDate,
} from "@/lib/format";

/**
 * Week 2 Day 4, Concept 2 — the detail panel reads CLIENT state from Zustand and
 * SERVER state from React Query, keeping the two cleanly separated.
 *
 * The store is read with INDIVIDUAL selectors (one `useJobStore` call per slice),
 * never by destructuring the whole store — so this component re-renders only when
 * the specific value it uses changes. The job payload itself is NOT in the store;
 * we fetch it here with `useQuery`, gated by `enabled: !!selectedJobId`, so no
 * request fires until a row is actually selected.
 */
export default function JobDetailPanel() {
  // Individual selectors — never `const { ... } = useJobStore()`.
  const selectedJobId = useJobStore((s) => s.selectedJobId);
  const isDetailPanelOpen = useJobStore((s) => s.isDetailPanelOpen);
  const closeDetailPanel = useJobStore((s) => s.closeDetailPanel);
  const setSelectedJobId = useJobStore((s) => s.setSelectedJobId);

  const {
    data: job,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["job", selectedJobId],
    queryFn: () => fetchJobById(selectedJobId as string),
    enabled: !!selectedJobId,
  });

  // After a successful delete, clear the selection and close the panel.
  const deleteMutation = useDeleteJob(() => {
    setSelectedJobId(null);
    closeDetailPanel();
  });

  if (!isDetailPanelOpen || !selectedJobId) {
    return (
      <aside className="hidden lg:flex lg:h-full lg:items-center lg:justify-center lg:rounded-2xl lg:border lg:border-dashed lg:border-slate-300 lg:bg-white/50 lg:p-8 lg:text-center dark:lg:border-slate-700 dark:lg:bg-slate-900/40">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select a job to see its full details here.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
          Job details
        </h2>
        <button
          type="button"
          onClick={closeDetailPanel}
          aria-label="Close details"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {isPending ? (
        <DetailSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          {error instanceof Error ? error.message : "Couldn't load this job."}
        </div>
      ) : job ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="flex flex-wrap items-center gap-2">
              <EmploymentTypeBadge employmentType={job.employmentType} />
              <ActiveStatusBadge isActive={job.isActive} />
            </div>

            <h3 className="mt-3 font-display text-xl font-extrabold text-ink dark:text-slate-100">
              {job.title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {job.company} · {job.location}
            </p>

            <p className="mt-3 text-base font-semibold text-ink dark:text-slate-100">
              {formatSalaryRange(job.salaryMin, job.salaryMax)}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Posted {formatRelativeDate(job.postedAt)}</span>
              {job.isActive ? <span>{formatClosingDate(job.closingDate)}</span> : null}
            </div>

            {job.description ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {job.description}
              </p>
            ) : null}

            {job.skills.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Skills
                </h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Delete — optimistic (Concept 4). Disabled while the request is in flight. */}
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            {deleteMutation.isError ? (
              <p className="mb-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : "Delete failed."}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => deleteMutation.mutate(job.id)}
              disabled={deleteMutation.isPending}
              className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete this job"}
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-20 w-full rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}
