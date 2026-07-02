import Link from "next/link";
import Image from "next/image";
import { MapPin, Building2 } from "lucide-react";
import { EmploymentTypeBadge } from "@/components/JobStatusBadge";
import type { JobSummaryView } from "@/lib/jobs-api";

/**
 * Assignment 3.3, Part 3 (Candidate B) — the CareerHub API does not (yet) return
 * a company logo URL, so we derive a deterministic logo from the company name
 * via ui-avatars.com. It is a REMOTE domain, so it is whitelisted in
 * `next.config.ts` → `images.remotePatterns`; next/image then optimises it to
 * WebP/AVIF on demand. No `priority`: logos sit inside a scrollable list, so in
 * aggregate they are below the fold and should lazy-load.
 */
function companyLogoUrl(company: string): string {
  const name = encodeURIComponent(company.trim() || "Company");
  return `https://ui-avatars.com/api/?name=${name}&size=96&background=4f46e5&color=fff&bold=true&format=png`;
}

/**
 * JobLinkCard — the listing-page card for Assignment 2.1.
 *
 * This is deliberately a SERVER COMPONENT: it has no state and no event
 * handlers, only <Link>s. <Link> uses `useRouter` internally, but that hook
 * runs inside <Link>'s OWN client module, not here — the "use client" boundary
 * is <Link>'s, so this wrapper never needs one. (Contrast with JobCard, which
 * takes an `onClick` selection handler and therefore MUST be a Client
 * Component.) JobCard is left untouched; this is a separate navigation card.
 *
 * STRETCHED-LINK PATTERN: the card is a <div>, not one big <Link>, because it
 * now carries TWO actions — "View details" and "Apply". You cannot nest an <a>
 * inside an <a>, so instead the "View details" link is stretched over the whole
 * card via `after:absolute after:inset-0` (clicking anywhere navigates to the
 * detail page and the listing stays shareable/prefetchable), while the "Apply"
 * button sits ABOVE that overlay with `relative z-10` so it remains its own
 * separate, clickable link straight to the wizard.
 */
export default function JobLinkCard({ job }: { job: JobSummaryView }) {
  const isClosed = job.status === "Closed";

  return (
    <div
      className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500"
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

      <div className="mt-4 flex items-start gap-3">
        {/* Fixed 40×40 box (explicit width/height on the image) so the row never
            reflows when the logo arrives — protects CLS. */}
        <Image
          src={companyLogoUrl(job.company)}
          alt={`${job.company} logo`}
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-lg"
        />
        <h2 className="font-display text-lg font-bold text-ink transition group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
          {job.title}
        </h2>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
        <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        {job.company}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
        {job.location}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        {/* Stretched over the whole card (after:inset-0) — the primary target. */}
        <Link
          href={`/jobs/${job.id}`}
          className="text-sm font-semibold text-brand-700 after:absolute after:inset-0 focus:outline-none dark:text-brand-300"
        >
          View details →
        </Link>

        {/* Apply lives above the stretched overlay (relative z-10) so it is its
            own clickable link. Hidden on closed listings — you can't apply to a
            role that is no longer accepting applications. Sign-in / role gating
            still happens on /apply/[jobId] itself. */}
        {!isClosed && (
          <Link
            href={`/apply/${job.id}`}
            className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            Apply →
          </Link>
        )}
      </div>
    </div>
  );
}
