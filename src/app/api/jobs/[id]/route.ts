import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { JOBS as SEED } from "@/lib/seed-jobs";
import {
  getJob,
  countApplicationsByJob,
  getJobStatusOverride,
  getDeletedJobIds,
  setJobStatus,
  deleteJobById,
} from "@/lib/server-store";
import type { JobListingDetailResponse } from "@/types";

/**
 * Mock backend: GET + PATCH /api/jobs/{id}.
 *
 * GET returns the FULL detail of one listing in the real API's
 * `JobListingDetailResponse` shape. It resolves recruiter-posted jobs first, then
 * falls back to the seed board, and applies the persisted lifecycle override
 * (Assignment 2.2) so a closed job reads "Closed".
 *
 * PATCH (Assignment 2.2) closes/updates a listing's status. It persists the
 * status to the store — the "module-level mutable array" role is played here by
 * the persistent store keyed by job id — so the change survives the process and
 * is visible to every other route that reads the same store.
 */

/** Problem Details (RFC 9457) — the project's standard error shape. */
function problem(title: string, detail: string, status: number) {
  return NextResponse.json({ title, detail, status }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // A hard-deleted listing (Week 2 Day 4) is gone — answer 404 before resolving.
  const deleted = await getDeletedJobIds();
  if (deleted.includes(id)) {
    return problem("Job not found", `No job exists with id '${id}'.`, 404);
  }

  const override = await getJobStatusOverride(id);

  const recruiterJob = await getJob(id);
  if (recruiterJob) {
    const detail: JobListingDetailResponse = {
      id: recruiterJob.id,
      title: recruiterJob.title,
      location: recruiterJob.location,
      type: recruiterJob.type,
      salaryMin: recruiterJob.salaryMin,
      salaryMax: recruiterJob.salaryMax,
      status: override ?? "Active",
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
      status: override ?? (seed.isActive ? "Active" : "Closed"),
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

  return problem("Job not found", `No job exists with id '${id}'.`, 404);
}

/**
 * PATCH /api/jobs/{id} — close (or otherwise re-status) a listing.
 *
 * Body: { "status": "Closed" }. Returns the updated job (200), a 400 if `status`
 * is missing, or a 404 (Problem Details) if no job has that id.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Resolve the target across BOTH sources first — a status change to an unknown
  // id is a genuine 404, not a silent no-op.
  const recruiterJob = await getJob(id);
  const seed = recruiterJob ? null : SEED.find((j) => j.id === id);
  if (!recruiterJob && !seed) {
    return problem("Job not found", `No job exists with id '${id}'.`, 404);
  }

  // A missing/unparseable body, or a body without `status`, is a client error.
  let body: { status?: unknown } = {};
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    // fall through to the 400 below — `status` will be undefined
  }
  if (typeof body.status !== "string" || body.status.trim() === "") {
    return problem(
      "Missing required field",
      "A non-empty 'status' is required in the request body.",
      400,
    );
  }

  const status = body.status.trim();
  await setJobStatus(id, status);

  // Echo back the updated listing so the caller can confirm WHICH job changed
  // (the Server Action reads `title` from this to confirm the close).
  if (recruiterJob) {
    const detail: JobListingDetailResponse = {
      id: recruiterJob.id,
      title: recruiterJob.title,
      location: recruiterJob.location,
      type: recruiterJob.type,
      salaryMin: recruiterJob.salaryMin,
      salaryMax: recruiterJob.salaryMax,
      status,
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

  const s = seed!;
  const detail: JobListingDetailResponse = {
    id: s.id,
    title: s.title,
    location: s.location,
    type: s.employmentType,
    salaryMin: s.salaryMin || null,
    salaryMax: s.salaryMax || null,
    status,
    createdAt: s.postedAt,
    expiresAt: s.closingDate,
    companyId: s.company.toLowerCase().replace(/\s+/g, "-"),
    companyName: s.company,
    companyCity: s.location,
    minimumExperienceYears: s.minimumExperienceYears,
    responsibilities: s.responsibilities,
    skills: s.skills,
    applicantCount: s.applicantCount + (await countApplicationsByJob(s.id)),
    description: s.description,
    minimumRequirements: s.minimumQualification,
    companyProvince: "",
    companyWebsite: "",
  };
  return NextResponse.json(detail);
}

/**
 * DELETE /api/jobs/{id} — hard-delete a listing (Week 2 Day 4, Concept 4).
 *
 * Records the id in the store's deleted set (and splices a recruiter job from
 * `jobs`), so every job-listing read excludes it from then on. Returns 204 on
 * success or a 404 (Problem Details) when no job has that id. It also clears the
 * "jobs" Data Cache tag so the cached 2.1 board (force-cache) reflects the
 * removal on its next load — keeping every view consistent with the delete.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existsInSeed = SEED.some((j) => j.id === id);
  const removed = await deleteJobById(id, existsInSeed);
  if (!removed) {
    return problem("Job not found", `No job exists with id '${id}'.`, 404);
  }

  revalidateTag("jobs");
  return new NextResponse(null, { status: 204 });
}
