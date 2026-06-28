import { NextResponse } from "next/server";
import { getMergedJobResponses } from "@/lib/job-board";
import type { JobListingResponse, PagedResponse } from "@/types";

/**
 * Mock backend: GET /api/jobs — the candidate board + employer dashboard source.
 *
 * Returns the page of listings in the real API's `PagedResponse<JobListingResponse>`
 * envelope, so every consumer adapts it unchanged. The page combines two sources:
 *   1. the built-in seed listings (demo data), and
 *   2. every job a recruiter has posted via POST /api/recruiter/jobs.
 *
 * Assignment 2.2 adds two things:
 *   • the search / location / sort / pagination query params the /jobs board
 *     sends are honoured here (server-side filtering), and
 *   • each row's `status` is resolved as `override ?? baseStatus`, where the
 *     override comes from the persistent store. Closing a job (PATCH
 *     /api/jobs/[id]) writes that override, so this list reflects the close on
 *     the very next request after revalidateTag("jobs") clears the cache.
 *
 * Only GET is exported, so any other verb gets Next.js's automatic 405.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.max(1, Number(searchParams.get("pageSize")) || 12);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const location = (searchParams.get("location") ?? "").trim().toLowerCase();
  const sort = (searchParams.get("sort") ?? "postedat").toLowerCase();
  const dir = (searchParams.get("dir") ?? "desc").toLowerCase();

  // The merged board (seed + recruiter jobs, statuses resolved, deleted removed)
  // is assembled in one shared place — see src/lib/job-board.ts.
  let all = await getMergedJobResponses();

  // Server-side search / filter (Assignment 2.1 feature, now over in-app data).
  if (q) {
    all = all.filter((j) =>
      [j.title, j.companyName, ...j.skills].some((s) =>
        s.toLowerCase().includes(q),
      ),
    );
  }
  if (location) {
    all = all.filter((j) => j.location.toLowerCase().includes(location));
  }

  // Server-side sort.
  const factor = dir === "asc" ? 1 : -1;
  all.sort((a, b) => {
    switch (sort) {
      case "salarymax":
        return ((a.salaryMax ?? 0) - (b.salaryMax ?? 0)) * factor;
      case "salarymin":
        return ((a.salaryMin ?? 0) - (b.salaryMin ?? 0)) * factor;
      default: // postedat
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          factor
        );
    }
  });

  const totalCount = all.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;
  const data = all.slice(start, start + pageSize);

  const payload: PagedResponse<JobListingResponse> = {
    data,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    links: null,
  };

  return NextResponse.json(payload);
}
