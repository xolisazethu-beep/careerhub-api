import { NextResponse } from "next/server";
import { JOBS } from "@/lib/seed-jobs";
import type { JobListing } from "@/types";

/**
 * Mock backend for CareerHub.
 *
 * `GET /api/jobs` returns the exact seed listings from Assignment 1.1 as JSON.
 * The component tree no longer imports the array directly — it fetches it over
 * HTTP through this handler, which is the seam a real production API would slot
 * into later without any component changes.
 *
 * The seed data deliberately covers every `EmploymentType` union value
 * (FullTime, PartTime, Contract, Internship) and includes at least one listing
 * with `isActive: false`, so the UI exercises every visual state from
 * Assignment 1.2 before a real API is ever connected.
 *
 * Only GET is handled. Any other method (POST, PUT, …) gets Next.js's default
 * 405 Method Not Allowed, because no corresponding export exists here.
 */
export async function GET() {
  const jobs: JobListing[] = JOBS;
  return NextResponse.json(jobs);
}
