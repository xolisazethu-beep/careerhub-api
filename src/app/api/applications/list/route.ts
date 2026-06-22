import { NextResponse } from "next/server";
import { listApplications, listApplicationsByJob } from "@/lib/server-store";

/**
 * GET /api/applications/list[?jobId=...]
 *
 * The recruiter-facing read side of the application store. Without a query it
 * returns every application; with `?jobId=` it scopes to one listing so the
 * recruiter can review just that job's candidates. It lives on a SEPARATE path
 * from POST /api/applications precisely so that endpoint can stay POST-only as
 * the assignment requires.
 */
export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("jobId");
  const applications = jobId
    ? await listApplicationsByJob(jobId)
    : await listApplications();
  return NextResponse.json({ applications });
}
