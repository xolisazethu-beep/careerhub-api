import Link from "next/link";
import { ArrowRight, Briefcase, LayoutDashboard } from "lucide-react";

/**
 * Home — a Server Component landing page (Assignment 2.1, Part 6).
 *
 * There is no "use client" here and no state, effects, or queries: the page is
 * pure HTML produced on the server, so the home route ships NO JavaScript
 * bundle of its own. The job board itself now lives at its own URL (/jobs); this
 * page just points to the two main surfaces.
 */
export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
          <Briefcase className="h-4 w-4" aria-hidden="true" />
          CareerHub — South Africa
        </span>

        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink dark:text-slate-100 sm:text-5xl">
          Find your next role, or your next hire
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          CareerHub is a job board for South African tech. Candidates browse live
          listings and apply in a click; employers post roles that go live on the
          board instantly. Listings are fetched on the server, so every job has
          its own shareable URL.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            Browse jobs
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/recruiter"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900 dark:focus-visible:ring-offset-slate-950"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Employer dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
