/**
 * Type contract with the CareerHub backend.
 *
 * `JobListing` mirrors a single item in the `data` array returned by
 * `GET /api/v1/jobs` — the exact shape defined by `JobListingResponse.cs`
 * on the server. When the backend changes a field, a regenerated TypeScript
 * client updates this interface and every consumer fails to COMPILE until it
 * is fixed. A compile error is the correct failure mode — not a runtime crash.
 */

/**
 * The set of employment types the CareerHub API enum serialises to.
 * This is a union, not `string`, so any value outside this set is rejected
 * by the compiler the moment it is written — not silently at runtime.
 */
export type EmploymentType =
  | "FullTime"
  | "PartTime"
  | "Contract"
  | "Internship";

export interface JobListing {
  /** GUID, lowercase hyphenated — e.g. "a1b2c3d4-..." */
  id: string;
  title: string;
  company: string;
  location: string;
  employmentType: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  /** ISO 8601 date string — e.g. "2026-06-17T08:00:00Z" */
  postedAt: string;
  isActive: boolean;
  applicantCount: number;
}

/** A signed-in user. Auth is mocked locally for the frontend-only milestone. */
export interface User {
  id: string;
  name: string;
  email: string;
}
