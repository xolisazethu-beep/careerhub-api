import { NextResponse } from "next/server";
import { JOBS as SEED } from "@/lib/seed-jobs";
import { getJob, countApplicationsByJob } from "@/lib/server-store";
import type { JobListingDetailResponse } from "@/types";

/**
 * Mock backend: GET /api/jobs/{id} — the FULL detail of one listing in the
 * real API's `JobListingDetailResponse` shape, which `fetchJobById` consumes.
 * Resolves recruiter-posted jobs first, then falls back to the seed board.
 * A missing id is a genuine 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const recruiterJob = await getJob(id);
  if (recruiterJob) {
    const detail: JobListingDetailResponse = {
      id: recruiterJob.id,
      title: recruiterJob.title,
      location: recruiterJob.location,
      type: recruiterJob.type,
      salaryMin: recruiterJob.salaryMin,
      salaryMax: recruiterJob.salaryMax,
      status: "Active",
      createdAt: recruiterJob.createdAt,
      expiresAt: recruiterJob.expiresAt,
      companyId: recruiterJob.company.toLowerCase().replace(/\s+/g, "-"),
      companyName: recruiterJob.company,
      companyCity: recruiterJob.location,
      minimumExperienceYears: recruiterJob.minimumExperienceYears,
      responsibilities: recruiterJob.responsibilities,
      skills: recruiterJob.skills,
      applicantCount: await countApplicationsByJob(recruiterJob.id),
      description: recruiterJob.description,
      minimumRequirements: recruiterJob.minimumRequirements,
      companyProvince: "",
      companyWebsite: "",
    };
    return NextResponse.json(detail);
  }

  const seed = SEED.find((j) => j.id === id);
  if (seed) {
    const detail: JobListingDetailResponse = {
      id: seed.id,
      title: seed.title,
      location: seed.location,
      type: seed.employmentType,
      salaryMin: seed.salaryMin || null,
      salaryMax: seed.salaryMax || null,
      status: seed.isActive ? "Active" : "Closed",
      createdAt: seed.postedAt,
      expiresAt: seed.closingDate,
      companyId: seed.company.toLowerCase().replace(/\s+/g, "-"),
      companyName: seed.company,
      companyCity: seed.location,
      minimumExperienceYears: seed.minimumExperienceYears,
      responsibilities: seed.responsibilities,
      skills: seed.skills,
      applicantCount: seed.applicantCount + (await countApplicationsByJob(seed.id)),
      description: seed.description,
      minimumRequirements: seed.minimumQualification,
      companyProvince: "",
      companyWebsite: "",
    };
    return NextResponse.json(detail);
  }

  return NextResponse.json(
    {
      title: "Job not found",
      detail: `No job exists with id '${id}'.`,
      status: 404,
    },
    { status: 404 },
  );
}
