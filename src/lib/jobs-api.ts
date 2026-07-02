/**
 * Server-side job data layer for the App Router routes (Assignment 2.1).
 *
 * Every consumer here is a Server Component, so these helpers run on the server
 * only — the data is fetched before the HTML is sent and NEVER refetched in the
 * browser. The fetch itself lives in each page (so `cache: "no-store"` is visible
 * at the call site, as the assignment requires); this module owns the base URL
 * and the wire→view adapters so the three routes stay in sync.
 *
 * NOTE ON THE BASE URL: this project established two public env vars in 1.4.
 *   • NEXT_PUBLIC_API_BASE_URL → the REAL ASP.NET + Postgres backend (job reads
 *     and now job writes). This is what the new Server Components read.
 *   • NEXT_PUBLIC_API_URL      → reserved for the in-app, same-origin mock routes
 *     (application submit, recruiter applicant review). Left UNSET on purpose so
 *     those calls stay same-origin.
 * The assignment text writes `${NEXT_PUBLIC_API_URL}/api/jobs`; here that role is
 * played by NEXT_PUBLIC_API_BASE_URL because a Server Component fetch needs an
 * ABSOLUTE url and this project already names the real backend that way.
 */

import { cache } from "react";
import type {
  JobListingResponse,
  JobListingDetailResponse,
  EmploymentType,
} from "@/types";
import { toEmploymentType } from "@/lib/employmentType";

/**
 * Absolute base of the REAL CareerHub backend (ASP.NET + Postgres). Server
 * Components need an absolute URL; this is the backend origin
 * (NEXT_PUBLIC_API_BASE_URL), defaulting to the local dev backend. Every job read
 * now goes to the live database — there is no mock route in the middle. The close
 * action's revalidateTag("jobs") still invalidates Next's Data Cache for these
 * fetches, so a close refreshes the cached board/detail on next render.
 *
 * Routes are versioned: use `${JOBS_API_BASE}${API_V1}/jobs...`.
 */
export const JOBS_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5080";

/** The API version segment every backend route lives under. */
export const API_V1 = "/api/v1";

/** One row of the per-job application-count stats (GET /api/applications/stats). */
export interface ApplicationStat {
  jobId: string;
  applicationCount: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resilient server-side fetch against the jobs backend.
 *
 * The Dockerised API has a real cold-start: the first query after idle can take
 * 15–30s and may briefly return a 5xx while the connection pool / query plan warms.
 * A bare `fetch` that throws on the first hiccup crashes the whole page. So this:
 *   • allows a generous per-attempt timeout (a slow-but-valid cold response still
 *     succeeds rather than being aborted), and
 *   • retries on network errors and 5xx with a short backoff (the backend is warm
 *     by the 2nd/3rd try).
 * It deliberately does NOT retry 4xx (a 404 must reach the page so it can call
 * `notFound()`); it still keeps `cache: "no-store"`; and it still throws once the
 * retries are exhausted, so the route's error boundary takes over gracefully.
 */
export async function fetchJobsApi(
  path: string,
  { retries = 3, timeoutMs = 30_000 } = {},
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${JOBS_API_BASE}${path}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) {
        await sleep(Math.min(500 * 2 ** attempt, 2500));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries) {
        await sleep(Math.min(500 * 2 ** attempt, 2500));
        continue;
      }
    }
  }
  throw new Error(
    `Could not reach the jobs API at ${JOBS_API_BASE} after ${retries + 1} attempts` +
      (lastError instanceof Error ? ` (${lastError.name})` : ""),
  );
}

/** The lean shape the listing grid and dashboard table render from. */
export interface JobSummaryView {
  id: string;
  title: string;
  company: string;
  location: string;
  /** Lifecycle status name: "Active" | "Closed" | "Draft". */
  status: string;
  employmentType: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  /** ISO 8601 posting date — used to sort the board by "newest". */
  createdAt: string;
}

/** Adapt one lean list item (`JobListingResponse`) into the view model. */
export function toSummaryView(r: JobListingResponse): JobSummaryView {
  // Part 3 coercion boundary — see the note in lib/api.ts::toJobListing.
  return {
    id: r.id,
    title: r.title,
    company: r.companyName,
    location: r.location,
    status: r.status,
    employmentType: toEmploymentType(r.type),
    salaryMin: r.salaryMin == null ? null : Number(r.salaryMin),
    salaryMax: r.salaryMax == null ? null : Number(r.salaryMax),
    createdAt: r.createdAt,
  };
}

/** The full shape the detail page renders, adding the heavy text fields. */
export interface JobDetailView extends JobSummaryView {
  description: string;
  minimumRequirements: string;
  responsibilities: string[];
  skills: string[];
  minimumExperienceYears: number;
  createdAt: string;
  expiresAt: string;
}

/** Adapt the detail projection (`JobListingDetailResponse`) into the view model. */
export function toDetailView(r: JobListingDetailResponse): JobDetailView {
  return {
    ...toSummaryView(r),
    description: r.description,
    minimumRequirements: r.minimumRequirements,
    responsibilities: r.responsibilities,
    skills: r.skills,
    minimumExperienceYears: Number(r.minimumExperienceYears),
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  };
}

/**
 * getJob — the single source of truth for reading ONE job (Assignment 3.3, Part 2/3).
 *
 * Wrapped in React's `cache()` so that when BOTH the page component AND
 * `generateMetadata` call `getJob(id)` during the same server render, Next.js
 * runs the underlying fetch exactly ONCE and hands the memoised result to the
 * second caller — no duplicate network request. The dedup key is (function
 * reference + arguments), so the condition for it to work is:
 *   • both call sites import THIS SAME `getJob` (not a re-implemented fetch), and
 *   • they pass the IDENTICAL `id` string, within the same request lifecycle.
 * (Next also layers its own Data Cache on the `force-cache` fetch below, but the
 * `cache()` wrapper is what collapses the two calls inside one render.)
 *
 * Returns `null` for a genuine 404 so callers can branch (page → notFound(),
 * generateMetadata → { title: "Job Not Found" }); throws on any other failure so
 * the route's error boundary takes over.
 */
export const getJob = cache(
  async (id: string): Promise<JobDetailView | null> => {
    // CACHE STRATEGY: cached + tagged with BOTH "jobs" and a per-job `job-${id}`
    // tag. Closing any job clears "jobs" (refreshing every listing/detail).
    const res = await fetch(`${JOBS_API_BASE}${API_V1}/jobs/${id}`, {
      cache: "force-cache",
      next: { tags: ["jobs", `job-${id}`] },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `Failed to load job ${id} — the API responded ${res.status} ${res.statusText}`,
      );
    }
    return toDetailView((await res.json()) as JobListingDetailResponse);
  },
);
