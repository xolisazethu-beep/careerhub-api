"use server";

import { revalidateTag } from "next/cache";

/**
 * closeJob — the employer's "Close Listing" Server Action (Assignment 2.2, Part 6).
 *
 * This function runs ONLY on the server. The browser never calls the PATCH
 * endpoint directly; it submits the <form> and React invokes this action over an
 * internal RPC. The action does three things in order:
 *   1. validates the jobId from the submitted FormData,
 *   2. PATCHes /api/jobs/{id} to set status "Closed", and
 *   3. on success, calls revalidateTag("jobs") — which clears EVERY cached
 *      response tagged "jobs", on BOTH /dashboard/listings and the candidate
 *      /jobs board. That cross-route invalidation is the whole point: the action
 *      runs from /dashboard but the affected cache feeds a different route.
 */

/** Discriminated union the form's useActionState carries between submissions. */
export type CloseJobState =
  | { status: "success"; jobTitle: string }
  | { status: "error"; message: string }
  | null;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function closeJobListing(
  _prevState: CloseJobState,
  formData: FormData,
): Promise<CloseJobState> {
  const jobId = formData.get("jobId");

  // Guard FIRST — a missing id never reaches the network.
  if (typeof jobId !== "string" || jobId.trim() === "") {
    return { status: "error", message: "Missing job reference — please try again." };
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Closed" }),
    });
  } catch {
    return {
      status: "error",
      message: "Couldn't reach the server. Please try again in a moment.",
    };
  }

  if (!res.ok) {
    // Surface the API's own Problem Details `detail` when present.
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    return {
      status: "error",
      message: body?.detail ?? `Couldn't close the listing (HTTP ${res.status}).`,
    };
  }

  const updated = (await res.json()) as { title?: string };

  // The mechanism that ties /dashboard to /jobs: clear the shared "jobs" tag …
  revalidateTag("jobs");
  // … and the per-job tag too (Stretch B), so this job's detail page refreshes.
  revalidateTag(`job-${jobId}`);

  return { status: "success", jobTitle: updated.title ?? "the listing" };
}
