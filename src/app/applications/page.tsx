// =============================================================
// src/app/applications/page.tsx
// Track Applications — reads the signed-in applicant's real history from
// the backend (GET /api/v1/applications/me). Shows each application's
// friendly stage (Applied / Pending / Accepted / Rejected) and the raw
// status the recruiter set, with a progress tracker. Updates whenever a
// recruiter changes a status.
// =============================================================
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { useApplicantAuth } from "@/context/ApplicantAuthContext";
import { fetchMyApplications, type MyApplication } from "@/lib/applicant-api";

// Happy-path friendly stages, in order. "Rejected" is terminal, shown on its own.
const STEPS = ["Applied", "Pending", "Accepted"] as const;

const PILL_CLASS: Record<string, string> = {
  Applied: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  Pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  Accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  Rejected: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
};

export default function ApplicationsPage() {
  const { applicant, ready } = useApplicantAuth();
  const [apps, setApps] = useState<MyApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(token: string) {
    setLoading(true);
    setError(null);
    try {
      setApps(await fetchMyApplications(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready && applicant) load(applicant.token);
  }, [ready, applicant]);

  if (!ready) return null;

  if (!applicant) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-white px-4 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Sign in to track your applications</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your application history lives with your job-seeker account.
          </p>
          <Link
            href="/candidate/signin?next=/applications"
            className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">My applications</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track the progress of every role you&apos;ve applied for.
            </p>
          </div>
          <button
            type="button"
            onClick={() => applicant && load(applicant.token)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}

        {apps === null ? (
          <div className="mt-12 flex justify-center text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          </div>
        ) : apps.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#1a1133]">
            <Inbox className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
            <h2 className="mt-4 text-lg font-semibold">No applications yet</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              When you apply for a role it will show up here.
            </p>
            <Link
              href="/jobs"
              className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Browse jobs
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {apps.map((app) => (
              <li
                key={app.jobListingId}
                className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/jobs/${app.jobListingId}`}
                      className="text-lg font-semibold hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      {app.jobTitle}
                    </Link>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {app.companyName} · applied{" "}
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full border px-3 py-1 text-xs font-semibold " +
                      (PILL_CLASS[app.stage] ?? PILL_CLASS.Applied)
                    }
                  >
                    {app.stage}
                    {app.status && app.status !== app.stage ? ` · ${app.status}` : ""}
                  </span>
                </div>

                {app.stage === "Rejected" ? (
                  <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                    Unfortunately this application was not successful. Keep going —
                    the right role is out there.
                  </p>
                ) : (
                  <ProgressTracker stage={app.stage} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ProgressTracker({ stage }: { stage: string }) {
  const currentIndex = Math.max(
    0,
    STEPS.indexOf(stage as (typeof STEPS)[number]),
  );

  return (
    <ol className="mt-6 flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isLast = i === STEPS.length - 1;
        return (
          <li key={step} className={"flex items-center " + (isLast ? "" : "flex-1")}>
            <div className="flex flex-col items-center">
              <span
                aria-current={i === currentIndex ? "step" : undefined}
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold " +
                  (done
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-400 dark:border-white/15 dark:bg-[#0f0a1e] dark:text-slate-500")
                }
              >
                {i + 1}
              </span>
              <span
                className={
                  "mt-2 w-20 text-center text-[11px] leading-tight " +
                  (done ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500")
                }
              >
                {step}
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden="true"
                className={
                  "mx-1 -mt-6 h-0.5 flex-1 " +
                  (i < currentIndex ? "bg-brand-600" : "bg-slate-200 dark:bg-white/15")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
