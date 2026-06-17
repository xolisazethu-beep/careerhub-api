"use client";

import type { JobListing } from "@/types";
import { EMPLOYMENT_TYPE_STYLES } from "@/lib/employmentType";
import {
  formatClosingDate,
  formatRelativeDate,
  formatSalaryRange,
} from "@/lib/format";

/**
 * Props are defined in the same file as the component. Nothing is `any`.
 * `isSelected` and `onSelect` are required by the assignment; `isSaved`,
 * `onToggleSave` and `onApply` are optional extras for the save / apply flow.
 */
export interface JobCardProps {
  job: JobListing;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  onApply?: (id: string) => void;
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.6L6 21V4.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function JobCard({
  job,
  isSelected,
  onSelect,
  isSaved = false,
  onToggleSave,
  onApply,
}: JobCardProps) {
  const typeStyle = EMPLOYMENT_TYPE_STYLES[job.employmentType];
  const closingLabel = job.isActive ? formatClosingDate(job.closingDate) : null;

  return (
    <article
      onClick={() => onSelect(job.id)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(job.id);
        }
      }}
      className={`group relative flex h-full cursor-pointer flex-col rounded-2xl border bg-white p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
        isSelected
          ? "border-brand-600 shadow-lg shadow-brand-900/10 ring-1 ring-brand-600"
          : "border-slate-200 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {/* Selection accent rail */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-5 left-0 w-1 rounded-full transition ${
          isSelected ? "bg-brand-600" : "bg-transparent"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${typeStyle.badge}`}
        >
          {typeStyle.label}
        </span>

        {onToggleSave ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSave(job.id);
            }}
            aria-label={isSaved ? "Remove from saved jobs" : "Save this job"}
            aria-pressed={isSaved}
            className={`-mr-1 -mt-1 rounded-lg p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
              isSaved
                ? "text-brand-700"
                : "text-slate-300 hover:text-slate-500"
            }`}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
        ) : null}
      </div>

      <h3 className="mt-3 font-display text-base font-bold leading-snug text-ink">
        {job.title}
      </h3>

      <p className="mt-1 text-sm text-slate-600">
        {job.company} · {job.location}
      </p>

      <p className="mt-3 text-sm font-semibold text-ink">
        {formatSalaryRange(job.salaryMin, job.salaryMax)}
      </p>

      {closingLabel ? (
        <p className="mt-1 text-xs font-medium text-brand-700">{closingLabel}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-slate-500">
        <span>Posted {formatRelativeDate(job.postedAt)}</span>

        {/* Applicant count appears ONLY when greater than zero.
            Using a conditional (not `&&` on the raw number) so a literal 0
            can never leak into the DOM. */}
        {job.applicantCount > 0 ? (
          <span className="flex items-center gap-1">
            <span aria-hidden="true">·</span>
            {job.applicantCount}{" "}
            {job.applicantCount === 1 ? "applicant" : "applicants"}
          </span>
        ) : null}

        {/* Closed label appears ONLY when the role is no longer active. */}
        {!job.isActive ? (
          <span className="ml-auto inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">
            Closed
          </span>
        ) : null}
      </div>

      {onApply && job.isActive ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onApply(job.id);
          }}
          className="mt-4 w-full rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 data-[selected=true]:opacity-100"
          data-selected={isSelected}
        >
          Apply now
        </button>
      ) : null}
    </article>
  );
}