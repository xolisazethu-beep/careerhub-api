// =============================================================
// src/app/about/page.tsx
// Static "About Us" page. Theme-aware (light + dark).
// =============================================================
import Link from "next/link";
import { Target, Heart, Sparkles } from "lucide-react";

export const metadata = {
  title: "About Us — CareerHub",
};

const values = [
  {
    icon: Target,
    title: "Purpose-built for South Africa",
    body: "Curated roles from local employers, with salaries in rands and locations you actually recognise.",
  },
  {
    icon: Heart,
    title: "Candidate-first",
    body: "One profile, every application tracked in one place — from submitted all the way to offer.",
  },
  {
    icon: Sparkles,
    title: "Always improving",
    body: "A learning project that keeps growing: cleaner flows, better accessibility, and smarter matching.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-[70vh] bg-white px-4 py-12 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
          About CareerHub
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
          Where South Africa goes to work.
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
          CareerHub connects job seekers with leading South African employers.
          We bring listings, applications and progress tracking into a single,
          calm place — so you can spend less time juggling tabs and more time
          landing your next role.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {values.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#1a1133]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                {body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]">
          <h2 className="text-lg font-semibold">Want to get in touch?</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            We&apos;d love to hear from you — find our phone, email and office
            address on the contact page.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  );
}
