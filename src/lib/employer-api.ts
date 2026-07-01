/**
 * Real-backend employer client (Assignment 2.1 — "post a job" wired to the API).
 *
 * Unlike the candidate auth (which uses this app's same-origin mock routes),
 * employer auth and job creation talk to the REAL ASP.NET + Postgres backend at
 * NEXT_PUBLIC_API_BASE_URL. The flow is:
 *   login/register → JWT (role "Employer", companyId) → POST /api/jobs with the
 *   bearer token. The backend takes the owning company FROM the token, so an
 *   employer can only ever post under their own company.
 *
 * These run in the browser (a Client Component calls them). The backend's CORS
 * policy allows http://localhost:3000 with credentials and an Authorization
 * header, so the cross-origin POST and its preflight succeed.
 *
 * Route note: the Auth and Companies controllers are ONLY mapped at the
 * versioned path (/api/v1/...); Jobs is mapped at both, so writes use /api/jobs.
 */

import type { EmploymentType } from "@/types";
import { fetchWithRetry } from "@/lib/http";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5080";

interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

/** The token + claims the backend returns from login/register. */
export interface EmployerAuth {
  token: string;
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
}

/** A company option for the registration picker. */
export interface CompanyOption {
  id: string;
  name: string;
  city: string;
}

/** The fields the "post a job" form collects, before backend-owned values. */
export interface NewJobListing {
  title: string;
  description: string;
  minimumRequirements: string;
  location: string;
  type: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  /** ISO 8601 — must be in the future (backend rule). */
  expiresAt: string;
  minimumExperienceYears: number;
  responsibilities: string[];
  skills: string[];
}

/** Pull the most useful message out of a Problem Details / validation body. */
async function readError(res: Response): Promise<string> {
  const p = (await res.json().catch(() => ({}))) as ProblemDetails;
  if (p.errors) {
    const first = Object.values(p.errors).flat()[0];
    if (first) return first;
  }
  return p.detail ?? p.title ?? `Request failed with ${res.status}`;
}

/** Verify employer credentials against the backend; returns the JWT + claims. */
export async function employerLogin(
  email: string,
  password: string,
): Promise<EmployerAuth> {
  const res = await fetchWithRetry(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as EmployerAuth;
}

/** Register a new employer bound to an existing company; returns the JWT. */
export async function employerRegister(input: {
  fullName: string;
  email: string;
  password: string;
  companyId: string;
}): Promise<EmployerAuth> {
  const res = await fetchWithRetry(`${API_BASE}/api/v1/auth/register/employer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as EmployerAuth;
}

/** Every company, for the registration company picker. */
export async function fetchCompanies(): Promise<CompanyOption[]> {
  const res = await fetchWithRetry(`${API_BASE}/api/v1/companies`, { cache: "no-store" });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as Array<{
    id: string;
    name: string;
    city: string;
  }>;
  return data.map((c) => ({ id: c.id, name: c.name, city: c.city }));
}

/** One of the employer's own postings, for the dashboard list. */
export interface EmployerJob {
  id: string;
  title: string;
  location: string;
  type: EmploymentType;
  status: string;
  createdAt: string;
  /** Real applicant count for this listing, computed by the backend. */
  applicantCount: number;
}

/**
 * The employer's own postings (any status), read from the real backend. This
 * endpoint is public (no token needed); the company is identified by id.
 */
export async function fetchCompanyJobs(
  companyId: string,
): Promise<EmployerJob[]> {
  const res = await fetchWithRetry(
    `${API_BASE}/api/v1/jobs/company/${companyId}?page=1&pageSize=100`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(await readError(res));
  const payload = (await res.json()) as {
    data: Array<{
      id: string;
      title: string;
      location: string;
      type: EmploymentType;
      status: string;
      createdAt: string;
      applicantCount: number;
    }>;
  };
  return payload.data.map((j) => ({
    id: j.id,
    title: j.title,
    location: j.location,
    type: j.type,
    status: j.status,
    createdAt: j.createdAt,
    applicantCount: j.applicantCount ?? 0,
  }));
}

/** One applicant on a job, as the recruiter reviews them (real backend). */
export interface JobApplication {
  jobListingId: string;
  applicantId: string;
  fullName: string;
  email: string;
  city: string;
  yearsOfExperience: number;
  coverNote: string;
  selectedSkills: string[];
  /** Raw status: Submitted | UnderReview | Shortlisted | Rejected | Offered. */
  status: string;
  /** Friendly stage: Applied | Pending | Accepted | Rejected. */
  stage: string;
  submittedAt: string;
  hasCv: boolean;
}

/** The status values the recruiter can move an application to. */
export type ReviewStatus = "UnderReview" | "Offered" | "Rejected";

/** Every applicant to one of the employer's listings (Employer JWT required). */
export async function fetchJobApplications(
  token: string,
  jobId: string,
): Promise<JobApplication[]> {
  const res = await fetchWithRetry(`${API_BASE}/api/v1/jobs/${jobId}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as JobApplication[];
}

/** Move one application to a new status (Employer JWT; enforces the state machine). */
export async function updateApplicationStatus(
  token: string,
  jobId: string,
  applicantId: string,
  status: ReviewStatus,
): Promise<void> {
  const res = await fetchWithRetry(
    `${API_BASE}/api/v1/applications/${jobId}/${applicantId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) throw new Error(await readError(res));
}

/**
 * Fetch an applicant's CV (PDF) as a blob, then open it in a new tab. Done with a
 * fetch (not a plain link) because the endpoint needs the Authorization header.
 */
export async function openApplicantCv(
  token: string,
  jobId: string,
  applicantId: string,
): Promise<void> {
  const res = await fetchWithRetry(
    `${API_BASE}/api/v1/jobs/${jobId}/applications/${applicantId}/cv`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(await readError(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  // Revoke shortly after so the new tab has time to load it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Publish a listing to the real backend. Requires a valid Employer JWT. */
export async function createJobListing(
  token: string,
  body: NewJobListing,
): Promise<{ id: string }> {
  const res = await fetchWithRetry(`${API_BASE}/api/v1/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { id: string };
}
