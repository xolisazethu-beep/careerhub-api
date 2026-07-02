import Link from "next/link";
import Image from "next/image";
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
    <div className="relative isolate overflow-hidden">
      {/* Full-bleed hero background photo. Lives in public/home-bg.jpg. As the
          largest above-the-fold element it is the LCP candidate, so it gets
          `priority` (preloaded, never lazy-loaded → faster LCP). `fill` +
          object-cover makes it cover the section at any viewport size. */}
      <Image
        src="/home-bg.jpg"
        alt="Professionals shaking hands after a successful hire"
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Dark gradient overlay so the white hero text stays readable over any
          part of the photo (protects contrast/accessibility). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/70 to-slate-950/90"
      />

      <div className="mx-auto max-w-4xl px-4 py-28 sm:px-6 sm:py-32">
        <section className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            CareerHub — South Africa
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-white drop-shadow sm:text-5xl">
            Find your next role, or your next hire
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-100/90">
            CareerHub is a job board for South African tech. Candidates browse
            live listings and apply in a click; employers post roles that go live
            on the board instantly. Listings are fetched on the server, so every
            job has its own shareable URL.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              Browse jobs
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/recruiter"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Employer dashboard
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
