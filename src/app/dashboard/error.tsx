"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * /dashboard error boundary. Catches a failed listings fetch (after retries) and
 * shows a recoverable panel rather than crashing the dashboard. It renders inside
 * the dashboard layout, so the sidebar stays in place. `reset()` re-attempts.
 */
export default function DashboardError({
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
    <div
      role="alert"
      className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center dark:border-amber-900/50 dark:bg-amber-950/20"
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-display text-lg font-bold text-ink dark:text-slate-100">
        We couldn&apos;t load the listings
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        The jobs service didn&apos;t respond in time. It usually recovers within a
        few seconds.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
      >
        Try again
      </button>
    </div>
  );
}
