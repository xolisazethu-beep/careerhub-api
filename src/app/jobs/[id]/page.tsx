import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Building2, Clock } from "lucide-react";
import RealApplyPanel from "@/components/RealApplyPanel";
import { EmploymentTypeBadge } from "@/components/JobStatusBadge";
import { fetchJobsApi, toDetailView } from "@/lib/jobs-api";
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

  const res = await fetchJobsApi(`/api/jobs/${id}`);

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

      {/* Composition: Server Component renders the Client Component below the
          server-rendered details — but only while the role is open. A closed
          listing shows an informational message instead of the form. */}
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
        ) : (
          <RealApplyPanel
            jobId={job.id}
            jobTitle={job.title}
            requiredSkills={job.skills}
          />
        )}
      </div>
    </div>
  );
}
