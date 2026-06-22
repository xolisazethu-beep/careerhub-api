import { NextResponse } from "next/server";
import { updateApplicationStatus } from "@/lib/server-store";
import type { RecruiterDecisionStatus } from "@/types";

/**
 * PATCH /api/applications/{id}
 *
 * The recruiter's decision endpoint. The body carries the new `status`
 * ("Accepted" | "Rejected" | "Under review" | "Submitted"); we update the
 * stored record and return it. An unknown id is a 404, an invalid status a 400.
 * Because the change is written to the server store, it is durable and any
 * later read (the candidate's status view, the recruiter list) reflects it.
 */
const VALID: RecruiterDecisionStatus[] = [
  "Submitted",
  "Under review",
  "Accepted",
  "Rejected",
];

function problem(title: string, detail: string, status: number) {
  return NextResponse.json({ title, detail, status }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return problem("Invalid request body", "Body must be JSON.", 400);
  }

  const status = body.status;
  if (!status || !VALID.includes(status as RecruiterDecisionStatus)) {
    return problem(
      "Invalid status",
      `'status' must be one of: ${VALID.join(", ")}.`,
      400,
    );
  }

  const updated = await updateApplicationStatus(
    id,
    status as RecruiterDecisionStatus,
  );
  if (!updated) {
    return problem("Application not found", `No application with id '${id}'.`, 404);
  }

  return NextResponse.json(updated);
}
