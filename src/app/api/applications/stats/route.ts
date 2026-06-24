import { NextResponse } from "next/server";
import { JOBS as SEED } from "@/lib/seed-jobs";
import { listJobs, countApplicationsByJob } from "@/lib/server-store";

/**
 * Mock backend: GET /api/applications/stats — application counts grouped by job.
 *
 * Shape: { jobId: string; applicationCount: number }[] — one entry per job from
 * the SAME sources GET /api/jobs/[id] reads (the seed board + recruiter postings),
 * so every jobId here matches a real listing. The count is a realistic baseline
 * (the seed's own `applicantCount`, or a small default for recruiter jobs) PLUS
 * any LIVE applications submitted via POST /api/applications, so the number on
 * the dashboard climbs as candidates apply.
 *
 * It returns an empty array — never a 404 — when there are no jobs. Only GET is
 * meaningful; POST returns an explicit 405 (Next.js would 405 anyway, but the
 * explicit handler carries a helpful Problem Details body).
 */
export interface ApplicationStat {
  jobId: string;
  applicationCount: number;
}

/** A deterministic, non-zero baseline for recruiter jobs (which carry no seed count). */
const RECRUITER_BASELINE = 3;

export async function GET() {
  const recruiterJobs = await listJobs();

  const recruiterStats: ApplicationStat[] = await Promise.all(
    recruiterJobs.map(async (j) => ({
      jobId: j.id,
      applicationCount: RECRUITER_BASELINE + (await countApplicationsByJob(j.id)),
    })),
  );

  const seedStats: ApplicationStat[] = await Promise.all(
    SEED.map(async (j) => ({
      jobId: j.id,
      applicationCount: j.applicantCount + (await countApplicationsByJob(j.id)),
    })),
  );

  return NextResponse.json([...recruiterStats, ...seedStats]);
}

export async function POST() {
  return NextResponse.json(
    {
      title: "Method Not Allowed",
      detail: "This endpoint only accepts GET requests.",
      status: 405,
    },
    { status: 405, headers: { Allow: "GET" } },
  );
}
