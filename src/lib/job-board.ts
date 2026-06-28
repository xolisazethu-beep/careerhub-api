// =============================================================
// src/lib/job-board.ts
// Shared server-side job-board assembly.
//
// Both GET /api/jobs (the 2.1 board) and GET /api/jobs/explore (the Week 2 Day 4
// infinite board) need the SAME merged list of listings: the seed demo jobs plus
// every recruiter-posted job, each carrying its effective lifecycle status
// (override ?? base) and with hard-deleted ids removed. That assembly lived
// inline in the /api/jobs route; it now lives here so there is a single source of
// truth and the two routes can never drift apart.
// =============================================================

import { JOBS as SEED } from "@/lib/seed-jobs";
import {
  listJobs,
  countApplicationsByJob,
  getJobStatusOverrides,
  getDeletedJobIds,
} from "@/lib/server-store";
import type { JobListing, JobListingResponse } from "@/types";
import type { RecruiterJob } from "@/lib/server-store";

/** Adapt a seed `JobListing` (UI model) into the API's lean wire shape. */
export function seedToResponse(
  job: JobListing,
  applicantCount: number,
  status: string,
): JobListingResponse {
  return {
    id: job.id,
    title: job.title,
    location: job.location,
    type: job.employmentType,
    salaryMin: job.salaryMin || null,
    salaryMax: job.salaryMax || null,
    status,
    createdAt: job.postedAt,
    expiresAt: job.closingDate,
    companyId: job.company.toLowerCase().replace(/\s+/g, "-"),
    companyName: job.company,
    companyCity: job.location,
    minimumExperienceYears: job.minimumExperienceYears,
    responsibilities: job.responsibilities,
    skills: job.skills,
    applicantCount,
  };
}

/** Adapt a recruiter-posted job into the same wire shape. */
export function recruiterToResponse(
  job: RecruiterJob,
  applicantCount: number,
  status: string,
): JobListingResponse {
  return {
    id: job.id,
    title: job.title,
    location: job.location,
    type: job.type,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    status,
    createdAt: job.createdAt,
    expiresAt: job.expiresAt,
    companyId: job.company.toLowerCase().replace(/\s+/g, "-"),
    companyName: job.company,
    companyCity: job.location,
    minimumExperienceYears: job.minimumExperienceYears,
    responsibilities: job.responsibilities,
    skills: job.skills,
    applicantCount,
  };
}

/**
 * The full board: recruiter jobs first (newest postings on top), then the seed
 * listings. Each row's status is `override ?? naturalStatus`, and any id in the
 * deleted set is filtered out entirely.
 */
export async function getMergedJobResponses(): Promise<JobListingResponse[]> {
  const [recruiterJobs, overrides, deleted] = await Promise.all([
    listJobs(),
    getJobStatusOverrides(),
    getDeletedJobIds(),
  ]);
  const deletedSet = new Set(deleted);

  const recruiterItems = await Promise.all(
    recruiterJobs.map(async (j) =>
      recruiterToResponse(
        j,
        await countApplicationsByJob(j.id),
        overrides[j.id] ?? "Active",
      ),
    ),
  );
  const seedItems = await Promise.all(
    SEED.map(async (j) =>
      seedToResponse(
        j,
        j.applicantCount + (await countApplicationsByJob(j.id)),
        overrides[j.id] ?? (j.isActive ? "Active" : "Closed"),
      ),
    ),
  );

  return [...recruiterItems, ...seedItems].filter(
    (j) => !deletedSet.has(j.id),
  );
}
