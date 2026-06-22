import { NextResponse } from "next/server";
import { addApplication } from "@/lib/server-store";
import type { ApplicationRequest } from "@/types";

/**
 * Mock backend for application submissions — Assignment 1.4, Part 2.
 *
 * Only POST is meaningful here. A GET returns 405 (see below). The handler
 * validates the two fields the server treats as mandatory (`jobId`, `email`),
 * simulates real network latency so the form's loading state is observable, and
 * on success persists the full application to the server store and echoes back a
 * lean 201 confirmation.
 *
 * This runs in the Node.js runtime (the default) because the server store uses
 * `node:fs` / `node:crypto`.
 */

/** Problem Details (RFC 9457) — the same error shape `fetchJobs` already expects. */
function problem(title: string, detail: string, status: number) {
  return NextResponse.json({ title, detail, status }, { status });
}

export async function POST(request: Request) {
  // Parse the JSON body. A malformed/empty body is a client error, not a crash.
  let body: Partial<ApplicationRequest>;
  try {
    body = (await request.json()) as Partial<ApplicationRequest>;
  } catch {
    return problem(
      "Invalid request body",
      "The request body could not be parsed as JSON.",
      400,
    );
  }

  // The server's minimal contract: an application is meaningless without the
  // job it targets and a way to reach the candidate. Everything else is the
  // client/Zod's responsibility — the server guards only these two.
  if (!body.jobId || !body.email) {
    return problem(
      "Missing required fields",
      "Both 'jobId' and 'email' are required to submit an application.",
      400,
    );
  }

  // Artificial 800ms latency. This is what makes the submit button's
  // "Submitting…" state and the disabled guard observable in the browser.
  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  // Persist the full application to the server store (the "database" the
  // recruiter views read from), then return the lean confirmation payload.
  const saved = await addApplication(body as ApplicationRequest);

  return NextResponse.json(
    {
      id: saved.id,
      jobId: saved.jobId,
      email: saved.email,
      submittedAt: saved.submittedAt,
    },
    { status: 201 },
  );
}

/**
 * Any non-POST verb is rejected. Next.js already returns 405 for a method with
 * no matching export, but we answer GET explicitly so the response carries a
 * helpful Problem Details body and the intent is obvious in the source.
 */
export async function GET() {
  return NextResponse.json(
    {
      title: "Method Not Allowed",
      detail: "This endpoint only accepts POST requests.",
      status: 405,
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
