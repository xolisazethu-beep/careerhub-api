"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * /jobs error boundary. If the resilient fetch in the listing page still fails
 * after its retries (e.g. the backend is genuinely down), this renders a calm
 * "couldn't load — try again" panel instead of crashing the route. `reset()`
 * re-runs the server render, which re-attempts the fetch.
 */
export default function JobsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center dark:border-amber-900/50 dark:bg-amber-950/20"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-lg font-bold text-ink dark:text-slate-100">
          We couldn&apos;t load the job board
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          The jobs service didn&apos;t respond in time. This usually clears in a
          few seconds while the backend warms up.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
