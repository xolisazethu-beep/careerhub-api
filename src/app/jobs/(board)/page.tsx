import type { Metadata } from "next";
import Link from "next/link";
import JobLinkCard from "@/components/JobLinkCard";
import JobFilters from "@/components/JobFilters";
import ClearFiltersButton from "@/components/ClearFiltersButton";
import {
  JOBS_API_BASE,
  API_V1,
  toSummaryView,
  type JobSummaryView,
} from "@/lib/jobs-api";
import type { JobListingResponse, PagedResponse } from "@/types";

export const metadata: Metadata = {
  title: "Browse jobs — CareerHub",
  description: "Live job listings, fetched on the server from the CareerHub API.",
};

/** Matches the page size requested below and the skeleton count in loading.tsx. */
const PAGE_SIZE = 50;

type StatusFilter = "open" | "all";

type SearchParams = {
  q?: string;
  location?: string;
  status?: string;
};

/**
 * getJobs — fetch then FILTER (Assignment 2.3, Part 6).
 *
 * The fetch is still cached + tagged "jobs" (so the close action's
 * revalidateTag("jobs") invalidates it). The mock API does not filter, so the
 * FULL unfiltered result is what the Data Cache stores; we then filter it in
 * JavaScript here — after cache retrieval — using the URL-derived params. That
 * means refreshing a filtered URL serves the cached list and re-filters with no
 * outbound fetch, until a close revalidates the tag.
 */
interface JobsResult {
  /** The jobs after the URL filters are applied. */
  jobs: JobSummaryView[];
  /** How many jobs exist on the board BEFORE filtering — the signal that tells
   *  the two empty states apart (Part 5 / Q4): 0 here = the DB is genuinely
   *  empty; > 0 with 0 filtered = the filters eliminated everything. */
  totalUnfiltered: number;
}

async function getJobs({
  q,
  location,
  status,
}: {
  q: string;
  location: string;
  status: StatusFilter;
}): Promise<JobsResult> {
  const res = await fetch(
    `${JOBS_API_BASE}${API_V1}/jobs?page=1&pageSize=${PAGE_SIZE}`,
    { cache: "force-cache", next: { tags: ["jobs"] } },
  );
  if (!res.ok) {
    throw new Error(`The API responded ${res.status} ${res.statusText}`);
  }
  const payload = (await res.json()) as PagedResponse<JobListingResponse>;
  const all = payload.data.map(toSummaryView);
  let jobs = all;

  if (q) {
    const needle = q.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(needle) ||
        j.company.toLowerCase().includes(needle),
    );
  }
  if (location) {
    const needle = location.toLowerCase();
    jobs = jobs.filter((j) => j.location.toLowerCase().includes(needle));
  }
  if (status === "open") {
    jobs = jobs.filter((j) => j.status !== "Closed");
  }

  return { jobs, totalUnfiltered: all.length };
}

/**
 * /jobs — the candidate-facing listing (Server Component). The filter state
 * lives in the URL (Part 6): this page reads `searchParams`, passes the values
 * to getJobs(), and renders the client <JobFilters/> that writes them back.
 */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const location = (sp.location ?? "").trim();
  const status: StatusFilter = sp.status === "open" ? "open" : "all";

  const hasFilters = Boolean(q || location || status === "open");

  let jobs: JobSummaryView[];
  let totalUnfiltered: number;
  try {
    ({ jobs, totalUnfiltered } = await getJobs({ q, location, status }));
  } catch {
    return <BoardUnavailable />;
  }

  // The two empty states are decided HERE, server-side, after the fetch — the
  // only place that knows the unfiltered total (Part 5 / Q4).
  //   • databaseEmpty → no jobs at all → no action to offer.
  //   • filteredOut   → jobs exist but the filters hid them → offer Clear.
  const databaseEmpty = totalUnfiltered === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100 sm:text-4xl">
          Open roles
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {hasFilters
            ? `${jobs.length.toLocaleString()} ${jobs.length === 1 ? "match" : "matches"}${q ? ` for “${q}”` : ""}${location ? ` in ${location}` : ""}`
            : `${jobs.length.toLocaleString()} live listings, fetched on the server straight from the CareerHub API.`}
        </p>
      </header>

      <div className="mb-8">
        <JobFilters />
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          {databaseEmpty ? (
            // STATE 1 — the board itself is empty. Nothing the user can do, so
            // we offer no action button.
            <>
              <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
                No jobs are currently listed.
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                There are no listings on the board at the moment. Check back
                soon — new positions are posted regularly.
              </p>
            </>
          ) : (
            // STATE 2 — jobs exist, the filters eliminated them. Offer a reset.
            <>
              <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
                No jobs match your search
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                None of the {totalUnfiltered.toLocaleString()} live listings match
                {q ? ` “${q}”` : ""}
                {location ? ` in ${location}` : ""}
                {status === "open" ? " (open roles only)" : ""}. Try a different
                search, or clear your filters to see everything.
              </p>
              <ClearFiltersButton />
            </>
          )}
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
 * reloads /jobs, which re-runs the server fetch.
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
