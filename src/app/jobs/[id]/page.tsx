import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Building2, Clock } from "lucide-react";
import { auth } from "@/auth";
import { EmploymentTypeBadge } from "@/components/JobStatusBadge";
import { JOBS_API_BASE, API_V1, toDetailView } from "@/lib/jobs-api";
import type { JobListingDetailResponse } from "@/types";

/**
 * /jobs/[id] — the job detail page (Assignment 2.1, Part 4).
 *
 * This is the Server/Client composition moment. THIS component is a Server
 * Component: it runs on the server, fetches the single job, and produces HTML.
 * It then renders <ApplicationForm />, a Client Component, passing it two plain
 * props. The form's interactivity (state, Zod validation, the submit mutation)
 * is hydrated in the browser; everything around it shipped as static HTML.
 *
 * In Next 15 `params` is a Promise that must be awaited. The URL segment is
 * ALWAYS a string — `[id]` is matched as raw text — and the backend's job ids
 * are string GUIDs, so the value is passed straight to the fetch with no
 * parsing or conversion.
 */
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ROLE-GATED APPLY (Assignment 2.3, Part 5): the job fetch and the session are
  // independent, so they run IN PARALLEL with Promise.all — the session read
  // adds no latency to the page. /jobs/[id] stays PUBLIC (employers can view the
  // detail); only the apply *form* is gated, here in the page rather than in
  // middleware, because the gate is content-level, not whole-route.
  const [res, session] = await Promise.all([
    // CACHE STRATEGY (Part 3 + Stretch B): cached + tagged with BOTH "jobs" and a
    // per-job `job-${id}` tag. The close action clears "jobs" (so closing ANY job
    // refreshes every listing/detail), and could clear `job-${id}` to refresh just
    // this one. `force-cache` is what enables Next 15's Data Cache for this fetch.
    fetch(`${JOBS_API_BASE}${API_V1}/jobs/${id}`, {
      cache: "force-cache",
      next: { tags: ["jobs", `job-${id}`] },
    }),
    auth(),
  ]);

  // A genuine "no such job" → render the not-found boundary (HTTP 404), never a
  // half-built page. Any OTHER failure is a real error → throw to error.tsx.
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    throw new Error(
      `Failed to load job ${id} — the API responded ${res.status} ${res.statusText}`,
    );
  }

  const job = toDetailView((await res.json()) as JobListingDetailResponse);
  const isClosed = job.status === "Closed";
  const role = session?.user?.role;
  const isEmployer = role === "employer";
  const isSignedOut = !session;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <EmploymentTypeBadge employmentType={job.employmentType} />
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

        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink dark:text-slate-100 sm:text-3xl">
          {job.title}
        </h1>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" aria-hidden="true" /> {job.company}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" /> {job.location}
          </span>
          {job.minimumExperienceYears > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {job.minimumExperienceYears}+ yrs experience
            </span>
          )}
        </div>

        {job.description && (
          <section className="mt-6">
            <h2 className="font-display text-base font-bold text-ink dark:text-slate-100">
              About the role
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {job.description}
            </p>
          </section>
        )}

        {job.minimumRequirements && (
          <section className="mt-6">
            <h2 className="font-display text-base font-bold text-ink dark:text-slate-100">
              Minimum requirements
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {job.minimumRequirements}
            </p>
          </section>
        )}

        {job.skills.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display text-base font-bold text-ink dark:text-slate-100">
              Skills
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      {/* Composition + role gate (Part 5). The apply area depends on BOTH the
          listing's status and WHO is viewing:
            • closed listing  → informational message (no form, any user)
            • employer        → "Employers cannot apply" (no form)
            • signed-out      → the form, with a sign-in note above it
            • candidate       → the form, normally                          */}
      <div className="mt-6">
        {isClosed ? (
          <div
            role="status"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900/60"
          >
            <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
              This role is no longer accepting applications
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              The listing has closed. Browse the{" "}
              <Link
                href="/jobs"
                className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                open roles
              </Link>{" "}
              for positions still taking applications.
            </p>
          </div>
        ) : isEmployer ? (
          <div
            role="status"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900/60"
          >
            <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
              Employers cannot apply for jobs.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              You&apos;re signed in as an employer. Manage your listings from the{" "}
              <Link
                href="/dashboard/listings"
                className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                dashboard
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {isSignedOut && (
              <div
                role="note"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
              >
                You must be signed in to apply.{" "}
                <Link
                  href="/login"
                  className="font-semibold underline underline-offset-2"
                >
                  Sign in here.
                </Link>
              </div>
            )}

            {/* Assignment 3.2 — the full application now lives in the canonical
                5-step wizard at /apply/[jobId]. This card is the entry point. */}
            <div className="rounded-2xl border border-brand-500/30 bg-brand-50 p-6 dark:border-brand-800/60 dark:bg-brand-900/20">
              <h3 className="font-display text-lg font-bold text-ink dark:text-slate-100">
                Apply for this role
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                A guided, 5-step application: your details, qualifications,
                role-specific questions and document uploads. Your progress saves
                as you go.
              </p>
              <Link
                href={`/apply/${job.id}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Start application
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
