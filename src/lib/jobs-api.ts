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

import type { JobListingResponse, JobListingDetailResponse } from "@/types";

/** Absolute base of the real CareerHub backend (e.g. http://localhost:8080). */
export const JOBS_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/** The lean shape the listing grid and dashboard table render from. */
export interface JobSummaryView {
  id: string;
  title: string;
  company: string;
  location: string;
  /** Lifecycle status name: "Active" | "Closed" | "Draft". */
  status: string;
  employmentType: JobListingResponse["type"];
  salaryMin: number | null;
  salaryMax: number | null;
}

/** Adapt one lean list item (`JobListingResponse`) into the view model. */
export function toSummaryView(r: JobListingResponse): JobSummaryView {
  return {
    id: r.id,
    title: r.title,
    company: r.companyName,
    location: r.location,
    status: r.status,
    employmentType: r.type,
    salaryMin: r.salaryMin,
    salaryMax: r.salaryMax,
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
    minimumExperienceYears: r.minimumExperienceYears,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  };
}
