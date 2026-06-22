import { NextResponse } from "next/server";
import { addJob, listJobsByRecruiter, listJobs } from "@/lib/server-store";
import type { RecruiterJob } from "@/lib/server-store";

/**
 * Recruiter job endpoints, backed by the server store ("database").
 *
 *   GET  /api/recruiter/jobs[?recruiter=email]
 *        → all jobs, or just one recruiter's postings.
 *   POST /api/recruiter/jobs
 *        → create a job. Once created it appears on the public board
 *          (GET /api/jobs) AND in the recruiter's own dashboard.
 *
 * Persisting jobs server-side is what lets a recruiter see jobs they add on the
 * listing and lets applicant counts be computed against the same store.
 */
function problem(title: string, detail: string, status: number) {
  return NextResponse.json({ title, detail, status }, { status });
}

export async function GET(request: Request) {
  const recruiter = new URL(request.url).searchParams.get("recruiter");
  const jobs = recruiter
    ? await listJobsByRecruiter(recruiter)
    : await listJobs();
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  let body: Partial<RecruiterJob>;
  try {
    body = (await request.json()) as Partial<RecruiterJob>;
  } catch {
    return problem("Invalid request body", "Body must be JSON.", 400);
  }

  if (!body.title || !body.company || !body.location || !body.postedBy) {
    return problem(
      "Missing required fields",
      "'title', 'company', 'location' and 'postedBy' are all required.",
      400,
    );
  }

  const job = await addJob({
    title: body.title,
    company: body.company,
    location: body.location,
    type: body.type ?? "FullTime",
    salaryMin: body.salaryMin ?? null,
    salaryMax: body.salaryMax ?? null,
    description: body.description ?? "",
    responsibilities: body.responsibilities ?? [],
    skills: body.skills ?? [],
    minimumExperienceYears: body.minimumExperienceYears ?? 0,
    minimumRequirements: body.minimumRequirements ?? "",
    postedBy: body.postedBy,
  });

  return NextResponse.json(job, { status: 201 });
}
