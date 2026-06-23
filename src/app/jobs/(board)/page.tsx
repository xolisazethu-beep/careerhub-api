import type { Metadata } from "next";
import Link from "next/link";
import JobLinkCard from "@/components/JobLinkCard";
import JobSearchBar from "@/components/JobSearchBar";
import { fetchJobsApi, toSummaryView } from "@/lib/jobs-api";
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

type SearchParams = {
  q?: string;
  location?: string;
  sort?: string;
};

/** Map the UI sort choice to the backend's sort+dir query params. */
function sortToApi(sort?: string): string {
  switch (sort) {
    case "oldest":
      return "&sort=postedat&dir=asc";
    case "salary_high":
      return "&sort=salarymax&dir=desc";
    case "salary_low":
      return "&sort=salarymin&dir=asc";
    default: // newest
      return "&sort=postedat&dir=desc";
  }
}

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
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const location = (sp.location ?? "").trim();

  // Build the backend query. Search (q), place (location) and sort all run on
  // the SERVER/DATABASE — the API already supports them — so results are filtered
  // before they ever reach the browser.
  let query = `/api/jobs?page=1&pageSize=${PAGE_SIZE}`;
  if (q) query += `&q=${encodeURIComponent(q)}`;
  if (location) query += `&location=${encodeURIComponent(location)}`;
  query += sortToApi(sp.sort);

  const hasFilters = Boolean(q || location || (sp.sort && sp.sort !== "newest"));

  let payload: PagedResponse<JobListingResponse>;
  try {
    const res = await fetchJobsApi(query);
    if (!res.ok) {
      throw new Error(`The API responded ${res.status} ${res.statusText}`);
    }
    payload = (await res.json()) as PagedResponse<JobListingResponse>;
  } catch {
    return <BoardUnavailable />;
  }

  const jobs = payload.data.map(toSummaryView);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100 sm:text-4xl">
          Open roles
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {hasFilters
            ? `${payload.totalCount.toLocaleString()} ${payload.totalCount === 1 ? "match" : "matches"}${q ? ` for “${q}”` : ""}${location ? ` in ${location}` : ""}`
            : `${payload.totalCount.toLocaleString()} live listings, fetched on the server straight from the CareerHub API.`}
        </p>
      </header>

      <div className="mb-8">
        <JobSearchBar />
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
            {hasFilters ? "No jobs match your search" : "No open roles right now"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {hasFilters ? (
              <>
                Try a different title or location, or{" "}
                <Link href="/jobs" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  clear your filters
                </Link>
                .
              </>
            ) : (
              "There are no active listings on the board at the moment. Check back soon — new positions are posted regularly."
            )}
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

/**
 * Friendly fallback when the jobs API can't be reached even after retries.
 * A Server Component (no client JS): the "Refresh" link is a plain anchor that
 * reloads /jobs, which re-runs the server fetch — by then the backend is usually
 * warm. This guarantees the route degrades calmly instead of crashing.
 */
function BoardUnavailable() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
        <h1 className="font-display text-xl font-bold text-ink dark:text-slate-100">
          The job board is warming up
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          We couldn&apos;t reach the jobs service just now. The backend can take a
          few seconds to wake on a cold start — please refresh in a moment.
        </p>
        <Link
          href="/jobs"
          prefetch={false}
          className="mt-5 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Refresh
        </Link>
      </div>
    </div>
  );
}
