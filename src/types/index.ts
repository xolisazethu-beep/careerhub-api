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
  | "Internship"
  | "Learnership";

/**
 * The exact shape of ONE item in the `data` array of the real CareerHub API's
 * paginated job board (`GET /api/jobs` → `PagedResponse<JobListingResponse>`).
 * Field names and nullability mirror `DTOs/Dtos.cs::JobListingResponse` on the
 * ASP.NET Core server (JSON is camelCased by the default serializer). The list
 * projection is deliberately lean: it carries NONE of the long-form fields
 * (description, responsibilities, skills, …) — those live on the detail
 * endpoint `GET /api/jobs/{id}`. `fetchJobs` adapts this into `JobListing`.
 */
export interface JobListingResponse {
  id: string;
  title: string;
  location: string;
  /** Serialised enum NAME: "FullTime" | "PartTime" | … (see JobType on the server). */
  type: EmploymentType;
  /** ZAR, monthly gross. Null when the advert says "market related". */
  salaryMin: number | null;
  salaryMax: number | null;
  /** Lifecycle name: "Draft" | "Active" | "Closed". The public board only returns "Active". */
  status: string;
  /** ISO 8601 — when the listing was posted. */
  createdAt: string;
  /** ISO 8601 — when the listing stops accepting applications. */
  expiresAt: string;
  companyId: string;
  companyName: string;
  companyCity: string;
  /** Minimum years of professional experience. 0 = open to entry-level. */
  minimumExperienceYears: number;
  /** Day-to-day duties (PostgreSQL text[] on the server). */
  responsibilities: string[];
  /** Tools/frameworks/languages (PostgreSQL text[] on the server). */
  skills: string[];
  /** How many applications this listing has received (server-side COUNT). */
  applicantCount: number;
}

/**
 * The shape of `GET /api/jobs/{id}` — the FULL detail of one listing, mirroring
 * `DTOs/Dtos.cs::JobListingDetailResponse`. It is `JobListingResponse` plus the
 * heavy text fields the board view omits (`description`, `minimumRequirements`)
 * and two extra company fields (`companyProvince`, `companyWebsite`). This is the
 * endpoint `fetchJobById` calls to hydrate the long-form fields a list item lacks.
 */
export interface JobListingDetailResponse extends JobListingResponse {
  description: string;
  /** The non-negotiable qualifications/skills for the role (free text). */
  minimumRequirements: string;
  companyProvince: string;
  companyWebsite: string;
}

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

/** A signed-in user. Auth is mocked locally for the frontend-only milestone. */
export interface User {
  id: string;
  name: string;
  email: string;
}