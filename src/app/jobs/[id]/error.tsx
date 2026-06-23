"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * /jobs/[id] error boundary (Assignment 2.1, Stretch B).
 *
 * Next requires error.tsx to be a Client Component: it receives `error` and
 * `reset` and must run in the browser to re-attempt rendering. It catches any
 * error THROWN while rendering the detail page — e.g. the page's `throw new
 * Error(...)` on a non-404 API failure — and replaces the default Next error
 * screen with this one. A 404 does NOT land here; that path renders not-found.
 *
 * `reset()` re-runs the route's render (re-fetching the job); if the backend has
 * recovered, the real detail page comes back without a full page reload.
 */
export default function JobDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for debugging; in production this would go to a logger.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16 text-center">
      <div>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <TriangleAlert className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink dark:text-slate-100">
          Something went wrong
        </h1>
        <p className="mx-auto mt-2 max-w-md break-words text-sm text-slate-600 dark:text-slate-400">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
