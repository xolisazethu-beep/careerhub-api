import type {
  JobListing,
  JobListingResponse,
  JobListingDetailResponse,
  PagedResponse,
} from "@/types";

/**
 * Pure client-side network layer for reading jobs from the REAL CareerHub API.
 * No React, no components — just the HTTP calls TanStack Query / pages use as
 * their queryFn. Everything targets the versioned backend routes.
 */

/** Base URL of the real CareerHub backend (ASP.NET + Postgres). */
const JOBS_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5080";

/**
 * Adapt one lean list item from the API (`JobListingResponse`) into the richer
 * `JobListing` view-model the UI consumes. The list projection carries the
 * structured fields too (responsibilities, skills, experience, applicant count);
 * only the long-form text (`description`, `minimumQualification`) is detail-only
 * and hydrated by `fetchJobById`.
 */
function toJobListing(r: JobListingResponse): JobListing {
  return {
    id: r.id,
    title: r.title,
    company: r.companyName,
    location: r.location,
    employmentType: r.type,
    salaryMin: r.salaryMin ?? 0,
    salaryMax: r.salaryMax ?? 0,
    postedAt: r.createdAt,
    isActive: r.status === "Active",
    closingDate: r.expiresAt,
    applicantCount: r.applicantCount ?? 0,
    responsibilities: r.responsibilities ?? [],
    skills: r.skills ?? [],
    minimumExperienceYears: r.minimumExperienceYears ?? 0,
    description: "",
    minimumQualification: "",
  };
}

/** The active job board (first page), adapted to the UI model. */
export async function fetchJobs(): Promise<JobListing[]> {
  const res = await fetch(`${JOBS_API_BASE}/api/v1/jobs?page=1&pageSize=50`);
  if (!res.ok) {
    throw new Error(
      `Failed to load jobs — server responded with ${res.status} ${res.statusText}`,
    );
  }
  const payload = (await res.json()) as PagedResponse<JobListingResponse>;
  return payload.data.map(toJobListing);
}

/**
 * Fetch ONE listing in full from the detail endpoint (`GET /api/v1/jobs/{id}`),
 * hydrating the long-form fields the list projection omits. A 404 throws — which
 * routes it into TanStack Query's `isError` path at the call site.
 */
export async function fetchJobById(id: string): Promise<JobListing> {
  const res = await fetch(`${JOBS_API_BASE}/api/v1/jobs/${id}`);
  if (!res.ok) {
    throw new Error(
      `Failed to load job ${id} — server responded with ${res.status} ${res.statusText}`,
    );
  }
  const detail = (await res.json()) as JobListingDetailResponse;
  return {
    ...toJobListing(detail),
    description: detail.description,
    minimumQualification: detail.minimumRequirements,
  };
}
