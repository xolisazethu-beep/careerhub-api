import Link from "next/link";
import type { Metadata } from "next";
import { fetchJobsApi, toSummaryView } from "@/lib/jobs-api";
import type { JobListingResponse, PagedResponse } from "@/types";

export const metadata: Metadata = {
  title: "All listings — Employer Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * /dashboard/listings — the employer's data-dense view (Assignment 2.1, Part 5).
 *
 * A Server Component fetching the SAME endpoint as /jobs with `cache:
 * "no-store"`, but rendering a TABLE rather than a card grid: an employer wants
 * a scannable list, not a gallery. The data arrives in the server-rendered HTML
 * — there is no browser-side API call when this page loads.
 */
export default async function DashboardListingsPage() {
  // Resilient fetch (cold-start tolerant). pageSize is kept modest because the
  // backend computes a per-row applicant count, so a smaller page is much faster
  // — the total count in the subheading still reflects every listing.
  let payload: PagedResponse<JobListingResponse>;
  try {
    const res = await fetchJobsApi(`/api/jobs?page=1&pageSize=25`);
    if (!res.ok) {
      throw new Error(`The API responded ${res.status} ${res.statusText}`);
    }
    payload = (await res.json()) as PagedResponse<JobListingResponse>;
  } catch {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
        <h1 className="font-display text-xl font-bold text-ink dark:text-slate-100">
          Listings are warming up
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          We couldn&apos;t reach the jobs service just now. Please refresh in a
          moment — the backend can take a few seconds to wake on a cold start.
        </p>
        <Link
          href="/dashboard/listings"
          prefetch={false}
          className="mt-5 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Refresh
        </Link>
      </div>
    );
  }

  const jobs = payload.data.map(toSummaryView);

  return (
    <section>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink dark:text-slate-100">
          All Listings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {payload.totalCount.toLocaleString()} listings
        </p>
      </header>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
            No listings yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Once a role is posted it will appear here and on the public board.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 font-medium text-ink dark:text-slate-100">
                    {job.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {job.company}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {job.location}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        job.status === "Closed"
                          ? "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          : "rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                      }
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
