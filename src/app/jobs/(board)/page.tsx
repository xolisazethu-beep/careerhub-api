import type { Metadata } from "next";
import JobLinkCard from "@/components/JobLinkCard";
import { JOBS_API_BASE, toSummaryView } from "@/lib/jobs-api";
import type { JobListingResponse, PagedResponse } from "@/types";

export const metadata: Metadata = {
  title: "Browse jobs — CareerHub",
  description: "Live job listings, fetched on the server from the CareerHub API.",
};

// `no-store` already opts this route into dynamic rendering; declaring it
// explicitly guarantees `next build` never tries to fetch the backend at build
// time and keeps every request server-fresh.
export const dynamic = "force-dynamic";

/** Matches the page size requested below and the skeleton count in loading.tsx. */
const PAGE_SIZE = 12;

/**
 * /jobs — the candidate-facing listing, as a Server Component (Assignment 2.1).
 *
 * The fetch runs ON THE SERVER while this page renders, so the job data is baked
 * into the HTML the browser receives — there is NO browser-side request to the
 * jobs API on load. `cache: "no-store"` opts out of Next's server-side fetch
 * cache: every request re-fetches, so a job posted seconds ago (the backend
 * sorts newest-first) is on this page immediately. While the fetch is in flight
 * Next streams `loading.tsx` via Suspense.
 */
export default async function JobsPage() {
  const res = await fetch(
    `${JOBS_API_BASE}/api/jobs?page=1&pageSize=${PAGE_SIZE}`,
    { cache: "no-store" },
  );

  // Do not swallow errors: a non-2xx surfaces to the nearest error boundary.
  if (!res.ok) {
    throw new Error(
      `Failed to load jobs — the API responded ${res.status} ${res.statusText}`,
    );
  }

  const payload = (await res.json()) as PagedResponse<JobListingResponse>;
  const jobs = payload.data.map(toSummaryView);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100 sm:text-4xl">
          Open roles
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {payload.totalCount.toLocaleString()} live listings, fetched on the
          server straight from the CareerHub API.
        </p>
      </header>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
            No open roles right now
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            There are no active listings on the board at the moment. Check back
            soon — new positions are posted regularly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobLinkCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
