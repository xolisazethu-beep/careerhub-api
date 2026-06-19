import type { JobListing } from "@/types";

/**
 * Pure network layer. No React, no components — just the HTTP call.
 *
 * `fetchJobs` is what TanStack Query calls as its `queryFn`. Keeping it free of
 * any React import means it can be unit-tested, reused, or swapped without
 * touching a single component.
 */
export async function fetchJobs(): Promise<JobListing[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${baseUrl}/api/jobs`);

  // `fetch` only REJECTS on a network-level failure (DNS, offline, CORS, etc.).
  // A 404 or 500 still RESOLVES with `res.ok === false`. Without this check the
  // error response body would be parsed as if it were job data and handed to
  // the UI as a "success". Throwing here is what routes HTTP errors into
  // TanStack Query's `isError` / `error` path. The status code is included so
  // the user-facing message is diagnostic, not generic.
  if (!res.ok) {
    throw new Error(`Failed to load jobs — server responded with ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as JobListing[];
}
