/**
 * Type contract with the CareerHub backend.
 *
 * `JobListing` mirrors a single item in the `data` array returned by
 * `GET /api/v1/jobs` — the exact shape defined by `JobListingResponse.cs`
 * on the server. When the backend changes a field, a regenerated TypeScript
 * client updates this interface and every consumer fails to COMPILE until it
 * is fixed. A compile error is the correct failure mode — not a runtime crash.
 */

import type { components } from "./api.generated";

/**
 * The set of employment types the CareerHub API enum serialises to.
 * This is a union, not `string`, so any value outside this set is rejected
 * by the compiler the moment it is written — not silently at runtime.
 */
export type EmploymentType =
  | "FullTime"
  | "PartTime"
  | "Contract"
  | "Internship"
  | "Learnership";

// ---------------------------------------------------------------------------
// Assignment 3.4, Part 3 — DTO MIRRORS now come from the generated client.
//
// `JobListingResponse` and `JobListingDetailResponse` used to be hand-written
// here. They are now RE-EXPORTED from `api.generated.ts`, which is produced by
// `npm run generate:types` straight from the backend's OpenAPI document — so the
// shapes are verified against what the API actually declares, not assumed.
//
// The generated types are deliberately LOOSER than the old hand-written ones
// (see the README "Type generation findings"): numeric fields are `number |
// string` and the enum `type` is a plain `string`. The wire→view adapters in
// `lib/api.ts` and `lib/jobs-api.ts` now COERCE at the boundary (Number(...),
// `toEmploymentType(...)`) so the rest of the app keeps its strict view-model.
// ---------------------------------------------------------------------------

/** ONE lean item of the paginated job board (`GET /api/v1/jobs`). */
export type JobListingResponse = components["schemas"]["JobListingResponse"];

/** The FULL detail of one listing (`GET /api/v1/jobs/{id}`). */
export type JobListingDetailResponse =
  components["schemas"]["JobListingDetailResponse"];

/**
 * The standard pagination envelope every list endpoint returns, mirroring
 * `DTOs/Dtos.cs::PagedResponse<T>`. The page of items lives in `data` (NOT
 * `items`); the rest is paging metadata. `links` is HATEOAS-lite navigation.
 */
export interface PagedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  links?: {
    self: string;
    next: string | null;
    previous: string | null;
    first: string;
    last: string;
  } | null;
}

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

  /** One-paragraph overview of the role. */
  description: string;
  /** What the person will actually do day-to-day. */
  responsibilities: string[];
  /** Required degree / qualification, e.g. "Bachelor's degree in Computer Science or related". */
  minimumQualification: string;
  /** Minimum years of professional experience required. 0 means open to entry-level. */
  minimumExperienceYears: number;
  /** Tools, frameworks and languages the candidate should know. */
  skills: string[];
  /** ISO 8601 date — the last day an application is accepted. */
  closingDate: string;
}

/**
 * A signed-in user — the safe projection the auth API returns (never the
 * password). Mirrors `SafeUser` in the server-side store.
 */
export interface User {
  id: string;
  name: string;
  email: string;
}

/** Body POSTed to `POST /api/auth/signup`. */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

/** Body POSTed to `POST /api/auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** The success payload both auth endpoints return: just the safe user. */
export interface AuthResponse {
  user: User;
}

/**
 * The body POSTed to `/api/applications` when a candidate applies for a role.
 * This is the wire contract the `ApplicationForm` produces (via `z.infer` of the
 * Zod schema, plus the `jobId` injected from the selected listing) and the
 * route handler consumes. Optional fields (`phone`, `linkedInUrl`) are omitted
 * entirely when the candidate leaves them blank — see the empty-string pattern
 * in the form schema.
 */
export interface ApplicationRequest {
  jobId: string;
  fullName: string;
  email: string;
  phone?: string;
  yearsOfExperience: number;
  coverLetter: string;
  linkedInUrl?: string;
  availableImmediately: boolean;
  noticePeriodWeeks: number;
}

/**
 * The 201 payload the `/api/applications` route returns on a successful submit.
 * It is intentionally lean: a server-generated `id`, the `jobId`/`email` echoed
 * back for confirmation, and the server's `submittedAt` timestamp. The form
 * renders its success panel from this; the recruiter views read the full record
 * (see `RecruiterApplication`) from the server store separately.
 */
export interface ApplicationResponse {
  id: string;
  jobId: string;
  email: string;
  submittedAt: string;
}

/**
 * One stored application as the server-side store keeps it — the full submitted
 * body plus server-owned fields (`id`, `submittedAt`, and the recruiter-managed
 * `status`). This is what the recruiter applicant-review screens read and what a
 * status decision (accept/reject) mutates. It is NOT part of the assignment's
 * minimal contract; it backs the extra recruiter requirements.
 */
export type RecruiterDecisionStatus =
  | "Submitted"
  | "Under review"
  | "Accepted"
  | "Rejected";

export interface RecruiterApplication extends ApplicationRequest {
  id: string;
  submittedAt: string;
  status: RecruiterDecisionStatus;
}