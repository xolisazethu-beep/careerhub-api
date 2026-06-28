import type {
  JobListing,
  JobListingResponse,
  JobListingDetailResponse,
  PagedResponse,
  ApplicationRequest,
  ApplicationResponse,
  RecruiterApplication,
  RecruiterDecisionStatus,
  SignupRequest,
  LoginRequest,
  AuthResponse,
} from "@/types";

/** The Problem Details (RFC 9457) error shape every endpoint returns on failure. */
interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

/**
 * Pure network layer. No React, no components — just the HTTP call.
 *
 * `fetchJobs` is what TanStack Query calls as its `queryFn`. Keeping it free of
 * any React import means it can be unit-tested, reused, or swapped without
 * touching a single component.
 */

/**
 * Base URL of the REAL CareerHub job API (the ASP.NET + Postgres backend, e.g.
 * http://localhost:8080). Only the public job board reads (`fetchJobs`,
 * `fetchJobById`) use it, so the homepage shows live listings from the database.
 *
 * When the env var is absent we fall back to a relative URL, so the app still
 * works against the in-app mock route (`src/app/api/jobs`) instead of fetching
 * `undefined/api/jobs`. The value is inlined at build time by Next because the
 * name carries the `NEXT_PUBLIC_` prefix — that is what exposes it to the browser
 * bundle where TanStack Query runs.
 */
const JOBS_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
  // The real backend lives at `NEXT_PUBLIC_API_BASE_URL` (e.g. http://localhost:8080).
  // `pageSize=50` pulls a full board in one request (the API defaults to 20 of
  // ~600); full client-side pagination is a separate feature. When the env var
  // is absent this is a relative URL, so the in-app mock route still serves the
  // board instead of the app fetching `undefined/api/jobs`.
  const res = await fetch(`${JOBS_API_BASE}/api/jobs?page=1&pageSize=50`);

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

// ---------- Week 2 Day 4: paginated board + delete ----------

/** The exact envelope GET /api/jobs/explore returns, items adapted to the UI model. */
export interface PaginatedJobs {
  items: JobListing[];
  page: number;
  limit: number;
  totalCount: number;
  hasMore: boolean;
}

/** The raw wire envelope before items are adapted. */
interface PaginatedJobsResponse {
  items: JobListingResponse[];
  page: number;
  limit: number;
  totalCount: number;
  hasMore: boolean;
}

/**
 * One page of the explore board (`GET /api/jobs/explore`). This is the `queryFn`
 * body behind the `useInfiniteQuery` on /jobs/explore: it takes the page param
 * plus the active filters and returns the assignment's
 * `{ items, page, limit, totalCount, hasMore }` envelope, with each wire item
 * adapted into the `JobListing` view-model the cards render.
 */
export async function getJobsPaginated(args: {
  page: number;
  limit: number;
  category?: string;
  minSalary?: number;
  remote?: boolean;
}): Promise<PaginatedJobs> {
  const params = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.category) params.set("category", args.category);
  if (args.minSalary) params.set("minSalary", String(args.minSalary));
  if (args.remote) params.set("remote", "true");

  const res = await fetch(`${JOBS_API_BASE}/api/jobs/explore?${params}`);
  if (!res.ok) {
    throw new Error(
      `Failed to load jobs — server responded with ${res.status} ${res.statusText}`,
    );
  }

  const payload = (await res.json()) as PaginatedJobsResponse;
  return {
    items: payload.items.map(toJobListing),
    page: payload.page,
    limit: payload.limit,
    totalCount: payload.totalCount,
    hasMore: payload.hasMore,
  };
}

/**
 * Hard-delete a listing (`DELETE /api/jobs/{id}`). The `mutationFn` behind the
 * optimistic delete on /jobs/explore. Resolves on 204; a 404/5xx throws so the
 * mutation's `onError` rolls the optimistic removal back.
 */
export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`${JOBS_API_BASE}/api/jobs/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as ProblemDetails;
    throw new Error(
      problem.detail ?? problem.title ?? `Failed to delete job (${res.status})`,
    );
  }
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
  const res = await fetch(`${JOBS_API_BASE}/api/jobs/${id}`);

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

const BASE_URL = () => process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Submit a job application — Assignment 1.4, Part 4.
 *
 * Mirrors `fetchJobs`: POST to `${BASE_URL}/api/applications`, JSON body, and
 * the same `res.ok` guard. On a non-2xx response the body is parsed as Problem
 * Details and thrown as an `Error` whose message is `detail ?? title`, so the
 * mutation's `error.message` is the server's own diagnostic. This function is
 * the `mutationFn` the `ApplicationForm` hands to `useMutation`; it stays free
 * of any React import so it is pure and testable.
 */
export async function submitApplication(
  body: ApplicationRequest,
): Promise<ApplicationResponse> {
  const res = await fetch(`${BASE_URL()}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as ProblemDetails;
    throw new Error(
      problem.detail ?? problem.title ?? `Request failed with ${res.status}`,
    );
  }

  return (await res.json()) as ApplicationResponse;
}

// ---------- Authentication ----------

/**
 * The auth endpoints always live in THIS Next.js app (they back onto the local
 * file store), so they use a same-origin relative path — never `BASE_URL`, which
 * may point at the external C# job API that has no auth routes.
 */
async function postAuth(
  path: "signup" | "login",
  body: SignupRequest | LoginRequest,
): Promise<AuthResponse> {
  const res = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const p = (await res.json().catch(() => ({}))) as ProblemDetails;
    throw new Error(p.detail ?? p.title ?? `Request failed with ${res.status}`);
  }
  return (await res.json()) as AuthResponse;
}

/** Register a new account against the real server store. */
export function signupRequest(body: SignupRequest): Promise<AuthResponse> {
  return postAuth("signup", body);
}

/** Verify credentials against the real server store. */
export function loginRequest(body: LoginRequest): Promise<AuthResponse> {
  return postAuth("login", body);
}

// ---------- Recruiter applicant review (extra requirements) ----------

/**
 * Every application submitted for one job (recruiter applicant review). Reads
 * the same server store the candidate's POST wrote to, so the recruiter sees
 * live submissions.
 */
export async function fetchApplicationsByJob(
  jobId: string,
): Promise<RecruiterApplication[]> {
  const res = await fetch(
    `${BASE_URL()}/api/applications/list?jobId=${encodeURIComponent(jobId)}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to load applicants — server responded ${res.status}`);
  }
  const json = (await res.json()) as { applications: RecruiterApplication[] };
  return json.applications;
}

/** Every application across all jobs (used for dashboard applicant counts). */
export async function fetchAllApplications(): Promise<RecruiterApplication[]> {
  const res = await fetch(`${BASE_URL()}/api/applications/list`);
  if (!res.ok) {
    throw new Error(`Failed to load applications — server responded ${res.status}`);
  }
  const json = (await res.json()) as { applications: RecruiterApplication[] };
  return json.applications;
}

/**
 * Record a recruiter's accept/reject (or move-to-review) decision. PATCHes the
 * application's status in the server store; the resolved record reflects the
 * persisted change so the UI can update from the source of truth.
 */
export async function decideApplication(
  id: string,
  status: RecruiterDecisionStatus,
): Promise<RecruiterApplication> {
  const res = await fetch(`${BASE_URL()}/api/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as ProblemDetails;
    throw new Error(problem.detail ?? problem.title ?? `Failed with ${res.status}`);
  }
  return (await res.json()) as RecruiterApplication;
}

/** A recruiter's own postings (matched by email). */
export async function fetchRecruiterJobs(
  recruiterEmail: string,
): Promise<RecruiterJobDto[]> {
  const res = await fetch(
    `${BASE_URL()}/api/recruiter/jobs?recruiter=${encodeURIComponent(recruiterEmail)}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to load your jobs — server responded ${res.status}`);
  }
  const json = (await res.json()) as { jobs: RecruiterJobDto[] };
  return json.jobs;
}

/** Post a new job to the server store; it then appears on the public board. */
export async function postRecruiterJob(
  input: NewRecruiterJob,
): Promise<RecruiterJobDto> {
  const res = await fetch(`${BASE_URL()}/api/recruiter/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as ProblemDetails;
    throw new Error(problem.detail ?? problem.title ?? `Failed with ${res.status}`);
  }
  return (await res.json()) as RecruiterJobDto;
}

/** The recruiter-job wire shape (kept here to avoid importing the server module). */
export interface RecruiterJobDto {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "FullTime" | "PartTime" | "Contract" | "Internship" | "Learnership";
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  responsibilities: string[];
  skills: string[];
  minimumExperienceYears: number;
  minimumRequirements: string;
  postedBy: string;
  createdAt: string;
  expiresAt: string;
}

export type NewRecruiterJob = Omit<
  RecruiterJobDto,
  "id" | "createdAt" | "expiresAt"
>;
