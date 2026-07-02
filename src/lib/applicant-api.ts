/**
 * Real-backend applicant client: candidate auth + applying (with CV + skills) +
 * tracking. Mirrors employer-api but for the Applicant role. Talks to the real
 * ASP.NET backend at NEXT_PUBLIC_API_BASE_URL; auth lives at /api/v1/auth, apply
 * is nested under the job (POST /api/v1/jobs/{id}/applications), and tracking is
 * GET /api/v1/applications/me.
 */

import { fetchWithRetry } from "@/lib/http";
import { parseApiError } from "@/lib/api-error";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5080";

/** Token + claims the backend returns from applicant login/register. */
export interface ApplicantAuth {
  token: string;
  userId: string;
  email: string;
  role: string;
  /** Display name, so the UI can greet the applicant without a second call. */
  fullName: string;
}

/** One row of the applicant's own application history (Track Applications). */
export interface MyApplication {
  jobListingId: string;
  jobTitle: string;
  companyName: string;
  /** Raw status: Submitted | UnderReview | Shortlisted | Rejected | Offered. */
  status: string;
  /** Friendly stage: Applied | Pending | Accepted | Rejected. */
  stage: string;
  submittedAt: string;
}

/** What the application form collects before submitting. */
export interface ApplyInput {
  coverNote: string;
  selectedSkills: string[];
  cv: File | null;
}

/** Verify applicant credentials; returns the JWT + claims. */
export async function applicantLogin(
  email: string,
  password: string,
): Promise<ApplicantAuth> {
  const res = await fetchWithRetry(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await parseApiError(res);
  return (await res.json()) as ApplicantAuth;
}

/** Register a new job-seeker account; returns the JWT. */
export async function applicantRegister(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<ApplicantAuth> {
  const res = await fetchWithRetry(`${API_BASE}/api/v1/auth/register/applicant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseApiError(res);
  return (await res.json()) as ApplicantAuth;
}

/**
 * Apply to a job. Sends multipart/form-data (cover note, ticked skills, optional
 * CV PDF). The Content-Type header is intentionally NOT set — the browser adds it
 * with the correct multipart boundary.
 */
export async function applyToJob(
  token: string,
  jobId: string,
  input: ApplyInput,
): Promise<void> {
  const fd = new FormData();
  fd.set("coverNote", input.coverNote);
  for (const skill of input.selectedSkills) fd.append("selectedSkills", skill);
  if (input.cv) fd.set("cv", input.cv);

  const res = await fetchWithRetry(`${API_BASE}/api/v1/jobs/${jobId}/applications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  // Throws a typed ApiError: 409 (already applied) → CONFLICT with the API's
  // specific message; 422/400 with field errors → VALIDATION carrying `fields`,
  // which the ApplicationWizard maps back onto the form (Part 2 Step 5).
  if (!res.ok) throw await parseApiError(res);
}

/** The signed-in applicant's application history (Track Applications). */
export async function fetchMyApplications(
  token: string,
): Promise<MyApplication[]> {
  const res = await fetchWithRetry(`${API_BASE}/api/v1/applications/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw await parseApiError(res);
  return (await res.json()) as MyApplication[];
}
