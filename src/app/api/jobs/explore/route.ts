import { NextResponse } from "next/server";
import { getMergedJobResponses } from "@/lib/job-board";
import type { JobListingResponse } from "@/types";

/**
 * GET /api/jobs/explore — the Week 2 Day 4 paginated board (Concept 3).
 *
 * Returns EXACTLY the assignment's envelope:
 *   { items, page, limit, totalCount, hasMore }
 * where `hasMore = page * limit < totalCount`. JSON is camelCase (Next's default),
 * which is what `getJobsPaginated` in lib/api.ts expects.
 *
 * Query params (all optional):
 *   • page      — 1-based page number (default 1)
 *   • limit     — page size (default 10)
 *   • category  — maps to the job's employment type (FullTime | PartTime | …)
 *   • minSalary — keep jobs whose pay ceiling is at least this many ZAR
 *   • remote    — when "true", keep only jobs whose location reads "Remote"
 *
 * This is a SEPARATE route from GET /api/jobs (which keeps its own PagedResponse
 * envelope for the 2.1 board) so neither board breaks the other.
 */

/** The exact pagination envelope the assignment requires. */
interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalCount: number;
  hasMore: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

  // Filters — mapped onto the fields the Job entity actually has.
  const category = (searchParams.get("category") ?? "").trim();
  const minSalary = Math.max(0, Number(searchParams.get("minSalary")) || 0);
  const remote = (searchParams.get("remote") ?? "").toLowerCase() === "true";

  let all = await getMergedJobResponses();

  // category → employment type. Empty/"All" means no constraint.
  if (category && category !== "All") {
    all = all.filter((j) => j.type === category);
  }
  // minSalary → keep jobs whose upper pay bound meets the floor.
  if (minSalary > 0) {
    all = all.filter((j) => (j.salaryMax ?? j.salaryMin ?? 0) >= minSalary);
  }
  // remote → location contains "remote".
  if (remote) {
    all = all.filter((j) => j.location.toLowerCase().includes("remote"));
  }

  const totalCount = all.length;
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  const payload: PaginatedResponse<JobListingResponse> = {
    items,
    page,
    limit,
    totalCount,
    hasMore: page * limit < totalCount,
  };

  return NextResponse.json(payload);
}
