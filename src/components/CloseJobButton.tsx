"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { closeJobListing } from "@/app/actions/closeJob";

/**
 * CloseJobButton — the per-row "Close Listing" control (Assignment 2.2, Part 6).
 *
 * A Client Component because it owns interactive state via `useActionState`
 * (the React 19 hook that drives a form with a Server Action). The hook returns
 * the action's latest result `state`, a `formAction` to wire to the <form>, and
 * `isPending` for the in-flight UI. The PATCH itself happens on the server inside
 * the action — there is NO fetch in the browser here.
 */
export default function CloseJobButton({
  jobId,
  currentStatus,
}: {
  jobId: string;
  currentStatus: string;
}) {
  // Hooks must run before any early return, so call it first.
  const [state, formAction, isPending] = useActionState(closeJobListing, null);

  // Already closed → nothing to do in this column.
  if (currentStatus === "Closed") return null;

  // Success → replace the button with a confirmation naming the closed job.
  if (state?.status === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Closed “{state.jobTitle}”
      </span>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        {isPending ? "Closing…" : "Close listing"}
      </button>
      {state?.status === "error" && (
        <p className="text-right text-xs text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
