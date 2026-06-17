"use client";

import type { JobListing } from "@/types";
import JobCard from "@/components/JobCard";

export interface JobListProps {
  jobs: JobListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  savedIds?: ReadonlySet<string>;
  onToggleSave?: (id: string) => void;
  onApply?: (id: string) => void;
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-ink dark:text-slate-100">
        No roles match these filters yet
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        New positions are posted across South Africa every day. Try widening
        your search or clearing a filter — or check back tomorrow for fresh
        listings from local employers.
      </p>
    </div>
  );
}

export default function JobList({
  jobs,
  selectedId,
  onSelect,
  savedIds,
  onToggleSave,
  onApply,
}: JobListProps) {
  return (
    <section aria-label="Job listings">
      <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
        Showing {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
      </p>

      {jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSelected={job.id === selectedId}
              onSelect={onSelect}
              isSaved={savedIds?.has(job.id) ?? false}
              onToggleSave={onToggleSave}
              onApply={onApply}
            />
          ))}
        </div>
      )}
    </section>
  );
}
