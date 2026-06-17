"use client";

import type { JobListing } from "@/types";
import { EMPLOYMENT_TYPE_STYLES } from "@/lib/employmentType";
import { formatRelativeDate, formatSalaryRange } from "@/lib/format";

export interface SummaryPanelProps {
  job: JobListing;
  onClear: () => void;
  onApply?: (id: string) => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-brand-100/80">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}

export default function SummaryPanel({ job, onClear, onApply }: SummaryPanelProps) {
  const typeStyle = EMPLOYMENT_TYPE_STYLES[job.employmentType];

  return (
    <div className="overflow-hidden rounded-2xl bg-brand-800 shadow-lg shadow-brand-900/20">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
              {typeStyle.label}
            </span>
            {!job.isActive ? (
              <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-brand-100">
                Closed
              </span>
            ) : null}
          </div>

          <h2 className="mt-2 font-display text-xl font-extrabold leading-tight text-white">
            {job.title}
          </h2>
          <p className="mt-1 text-sm text-brand-100">
            {job.company} · {job.location}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:max-w-md">
            <Stat label="Salary" value={formatSalaryRange(job.salaryMin, job.salaryMax)} />
            <Stat label="Posted" value={formatRelativeDate(job.postedAt)} />
            {job.applicantCount > 0 ? (
              <Stat label="Applicants" value={String(job.applicantCount)} />
            ) : null}
          </dl>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onApply && job.isActive ? (
            <button
              type="button"
              onClick={() => onApply(job.id)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Apply now
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="rounded-lg border border-white/25 p-2 text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
