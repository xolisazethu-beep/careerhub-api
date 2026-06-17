import Link from "next/link";
import type { ReactNode } from "react";

export interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem-5rem)] max-w-6xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden overflow-hidden rounded-3xl bg-brand-800 p-10 text-white lg:block">
        <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          CareerHub
        </span>
        <h2 className="mt-6 font-display text-3xl font-extrabold leading-tight">
          Where South Africa goes to work.
        </h2>
        <p className="mt-4 max-w-sm text-brand-100">
          Save roles, apply in a click, and keep every application in one place.
          Join thousands of job seekers finding their next opportunity.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-brand-50">
          {[
            "Curated listings from local employers",
            "One profile, every application",
            "Track which roles are still open",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden="true">
                  <path
                    d="m5 12 5 5 9-11"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Form panel */}
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-extrabold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">{footer}</p>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/" className="underline-offset-2 hover:underline">
            ← Back to listings
          </Link>
        </p>
      </div>
    </div>
  );
}
