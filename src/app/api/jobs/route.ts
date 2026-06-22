import { NextResponse } from "next/server";
import { JOBS as SEED } from "@/lib/seed-jobs";
import { listJobs, countApplicationsByJob } from "@/lib/server-store";
import type {
  JobListing,
  JobListingResponse,
  PagedResponse,
} from "@/types";
import type { RecruiterJob } from "@/lib/server-store";

/**
 * Mock backend: GET /api/jobs.
 *
 * Returns the page of listings in the real API's `PagedResponse<JobListingResponse>`
 * envelope, so `fetchJobs` adapts it unchanged. The page combines two sources:
 *   1. the built-in seed listings (Assignment 1.1 demo data), and
 *   2. every job a recruiter has posted via POST /api/recruiter/jobs.
 *
 * That second source is what makes a recruiter's own postings appear on the
 * public board (extra requirement). Each listing's `applicantCount` is computed
 * LIVE from the application store, so it climbs as candidates apply — which is
 * what TanStack Query's `["jobs"]` refetch surfaces after a successful submit.
 *
 * Only GET is exported, so any other verb gets Next.js's automatic 405.
 */

/** Adapt a seed `JobListing` (UI model) back into the API's lean wire shape. */
function seedToResponse(job: JobListing, applicantCount: number): JobListingResponse {
  return {
    id: job.id,
    title: job.title,
    location: job.location,
    type: job.employmentType,
    salaryMin: job.salaryMin || null,
    salaryMax: job.salaryMax || null,
    status: job.isActive ? "Active" : "Closed",
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
function recruiterToResponse(
  job: RecruiterJob,
  applicantCount: number,
): JobListingResponse {
  return {
    id: job.id,
    title: job.title,
    location: job.location,
    type: job.type,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    status: "Active",
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

export async function GET() {
  const recruiterJobs = await listJobs();

  // Recruiter jobs first (newest postings on top), then the seed board.
  const recruiterItems = await Promise.all(
    recruiterJobs.map(async (j) =>
      recruiterToResponse(j, await countApplicationsByJob(j.id)),
    ),
  );
  const seedItems = await Promise.all(
    SEED.map(async (j) =>
      seedToResponse(j, j.applicantCount + (await countApplicationsByJob(j.id))),
    ),
  );

  const data = [...recruiterItems, ...seedItems];

  const payload: PagedResponse<JobListingResponse> = {
    data,
    page: 1,
    pageSize: data.length,
    totalCount: data.length,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    links: null,
  };

  return NextResponse.json(payload);
}
