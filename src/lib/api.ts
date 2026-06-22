import type {
  JobListing,
  JobListingResponse,
  JobListingDetailResponse,
  PagedResponse,
} from "@/types";

/**
 * Pure network layer. No React, no components — just the HTTP call.
 *
 * `fetchJobs` is what TanStack Query calls as its `queryFn`. Keeping it free of
 * any React import means it can be unit-tested, reused, or swapped without
 * touching a single component.
 */

/**
 * Adapt ONE lean list item from the real API (`JobListingResponse`) into the
 * richer `JobListing` view-model the UI components already consume.
 *
 * The list projection now carries the structured fields too (responsibilities,
 * skills, minimum experience, applicant count) — the API was extended to match
 * the UI model. The only fields still exclusive to the detail endpoint are the
 * long-form text ones: `description` and `minimumQualification` (the server's
 * `minimumRequirements`). Those default to empty here and are hydrated by
 * `fetchJobById` from `GET /api/jobs/{id}`.
 */
function toJobListing(r: JobListingResponse): JobListing {
  return {
    id: r.id,
    title: r.title,
    company: r.companyName,
    location: r.location,
    employmentType: r.type,
    // The API salary fields are nullable ("market related"); the UI model is
    // non-nullable, so coalesce a missing figure to 0 (rendered as "—" upstream).
    salaryMin: r.salaryMin ?? 0,
    salaryMax: r.salaryMax ?? 0,
    postedAt: r.createdAt,
    // The public board only returns Active listings, but derive it honestly from
    // the lifecycle status so a future status filter still behaves correctly.
    isActive: r.status === "Active",
    closingDate: r.expiresAt,

    // Structured fields, now supplied directly by the list endpoint.
    applicantCount: r.applicantCount ?? 0,
    responsibilities: r.responsibilities ?? [],
    skills: r.skills ?? [],
    minimumExperienceYears: r.minimumExperienceYears ?? 0,

    // Long-form text — only on the detail endpoint; hydrated by fetchJobById.
    description: "",
    minimumQualification: "",
  };
}

export async function fetchJobs(): Promise<JobListing[]> {
  // The real backend lives at `NEXT_PUBLIC_API_URL` (e.g. http://localhost:5080).
  // We fall back to a relative URL so the app still works against the in-app mock
  // route if the env var is absent, instead of fetching `undefined/api/jobs`.
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
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

  // The real API wraps the page of listings in a PagedResponse envelope: the
  // array lives in `.data`. Unwrap it, then adapt each record to the UI model.
  const payload = (await res.json()) as PagedResponse<JobListingResponse>;
  return payload.data.map(toJobListing);
}

/**
 * Fetch ONE listing in full from the detail endpoint (`GET /api/jobs/{id}`).
 *
 * The detail projection (`JobListingDetailResponse`) carries the long-form
 * `description` and `minimumRequirements` the lean list item omits, so this is
 * how a detail/apply view hydrates the fields `fetchJobs` had to leave blank.
 * The result is still adapted into the UI's `JobListing` view-model: the fields
 * the API genuinely has no concept of (responsibilities, a structured skills
 * list, minimum experience years, applicant count) remain empty defaults.
 *
 * A 404 (listing removed or bad id) surfaces as a thrown error — which is what
 * routes it into TanStack Query's `isError` path at the call site.
 */
export async function fetchJobById(id: string): Promise<JobListing> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const res = await fetch(`${baseUrl}/api/jobs/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to load job ${id} — server responded with ${res.status} ${res.statusText}`);
  }

  const detail = (await res.json()) as JobListingDetailResponse;
  return {
    ...toJobListing(detail),
    // Hydrate the heavy text fields the list projection lacked.
    description: detail.description,
    minimumQualification: detail.minimumRequirements,
  };
}
