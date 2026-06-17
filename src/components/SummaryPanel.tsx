"use client";

import type { JobListing } from "@/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employmentType";
import {
  formatClosingDate,
  formatRelativeDate,
  formatSalaryRange,
} from "@/lib/format";

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

function formatExperience(years: number): string {
  if (years <= 0) return "Open to entry-level";
  if (years === 1) return "1+ year";
  return `${years}+ years`;
}

export default function SummaryPanel({ job, onClear, onApply }: SummaryPanelProps) {
  const typeLabel = EMPLOYMENT_TYPE_LABELS[job.employmentType];

  return (
    <div className="overflow-hidden rounded-2xl bg-brand-800 shadow-lg shadow-brand-900/20 dark:bg-brand-900 dark:ring-1 dark:ring-white/10">
      {/* Top hero — title, meta, stats, actions. */}
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
              {typeLabel}
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
            <Stat label="Closing" value={formatClosingDate(job.closingDate)} />
            <Stat label="Experience" value={formatExperience(job.minimumExperienceYears)} />
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

      {/* Detail body — description, what you'll do, requirements, skills. */}
      <div className="border-t border-white/10 bg-white px-6 py-6 text-ink dark:bg-slate-900 dark:text-slate-100 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-800 dark:text-brand-400">
              About the role
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {job.description}
            </p>

            <h3 className="mt-6 font-display text-sm font-bold uppercase tracking-wide text-brand-800 dark:text-brand-400">
              What you&apos;ll be doing
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              {job.responsibilities.map((item) => (
                <li key={item} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-5">
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-800 dark:text-brand-400">
                Minimum requirements
              </h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Qualification
                  </dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{job.minimumQualification}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Experience
                  </dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                    {formatExperience(job.minimumExperienceYears)}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wide text-brand-800 dark:text-brand-400">
                Tools &amp; skills
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <li
                    key={skill}
                    className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/20"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}