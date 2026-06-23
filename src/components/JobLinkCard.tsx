import Link from "next/link";
import { MapPin, Building2 } from "lucide-react";
import { EmploymentTypeBadge } from "@/components/JobStatusBadge";
import type { JobSummaryView } from "@/lib/jobs-api";

/**
 * JobLinkCard — the listing-page card for Assignment 2.1.
 *
 * This is deliberately a SERVER COMPONENT: it has no state and no event
 * handlers, only a <Link>. <Link> uses `useRouter` internally, but that hook
 * runs inside <Link>'s OWN client module, not here — the "use client" boundary
 * is <Link>'s, so this wrapper never needs one. (Contrast with JobCard, which
 * takes an `onClick` selection handler and therefore MUST be a Client
 * Component.) JobCard is left untouched; this is a separate navigation card.
 *
 * The whole card is the link target — clicking anywhere navigates to the job's
 * own URL, which is what makes a single listing shareable and prefetchable.
 */
export default function JobLinkCard({ job }: { job: JobSummaryView }) {
  const isClosed = job.status === "Closed";

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500"
    >
      <div className="flex items-start justify-between gap-3">
        <EmploymentTypeBadge employmentType={job.employmentType} />
        {/* Lifecycle status pill — the "JobStatusBadge" the listing shows. */}
        <span
          className={
            isClosed
              ? "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              : "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
          }
        >
          {job.status}
        </span>
      </div>

      <h2 className="mt-4 font-display text-lg font-bold text-ink transition group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
        {job.title}
      </h2>

      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
        <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        {job.company}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
        {job.location}
      </p>

      <span className="mt-auto pt-5 text-sm font-semibold text-brand-700 dark:text-brand-300">
        View details →
      </span>
    </Link>
  );
}
