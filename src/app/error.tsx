"use client";

// =============================================================
// src/app/error.tsx
// Assignment 3.4, Part 2 Step 3 — the GLOBAL error boundary.
//
// This is the catch-all for any route segment that does not declare its own
// closer `error.tsx`. It replaces Next's blank white error screen with a
// recoverable, branded page: heading + the error message + a "Try again" button
// (re-runs the segment) and a "Go home" link.
//
// The `useEffect(console.error)` is the single hook where a real error reporter
// (Sentry) is wired in — see src/instrumentation.ts.
// =============================================================

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry's Next SDK auto-captures errors that reach this boundary; this
    // explicit log is the local-dev hook and a belt-and-braces capture point.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 py-16 text-center">
      <div>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <TriangleAlert className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink dark:text-slate-100">
          Something went wrong
        </h1>
        <p className="mx-auto mt-2 max-w-md break-words text-sm text-slate-600 dark:text-slate-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
