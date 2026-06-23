import Link from "next/link";
import { SearchX } from "lucide-react";

/**
 * /jobs/[id] not-found boundary (Assignment 2.1, Part 4).
 *
 * Rendered whenever the detail page calls `notFound()` — i.e. the API returned
 * 404 for the requested id. It is a Server Component (no interactivity), and
 * because it lives inside the route tree it inherits the ROOT layout: the same
 * navbar and footer wrap it, so a bad job URL still looks like the rest of the
 * app rather than a bare error page. The HTTP response carries status 404.
 */
export default function JobNotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16 text-center">
      <div>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          <SearchX className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink dark:text-slate-100">
          Job not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
          We couldn&apos;t find a listing at this address. It may have been
          closed and removed, or the link may be incorrect.
        </p>
        <Link
          href="/jobs"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          Back to all jobs
        </Link>
      </div>
    </div>
  );
}
