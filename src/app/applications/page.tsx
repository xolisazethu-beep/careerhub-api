// =============================================================
// src/app/applications/page.tsx
// Lists the applications this person has submitted. When signed in we
// show only their applications (matched by email); otherwise we show
// everything stored on this device. Each card has a status pill and a
// 4-step progress tracker; "Rejected" is handled separately.
// =============================================================
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import {
  getApplications,
  getApplicationsByEmail,
  type Application,
  type ApplicationStatus,
} from "@/lib/careerhub-store";
import { useAuth } from "@/context/AuthContext";

// The happy-path stages, in order. "Rejected" is deliberately not here — it is
// a terminal state shown on its own, not a step on this track.
const STEPS: Exclude<ApplicationStatus, "Rejected">[] = [
  "Submitted",
  "Under review",
  "Interview",
  "Offer",
];

const PILL_CLASS: Record<ApplicationStatus, string> = {
  Submitted: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  "Under review":
    "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  Interview:
    "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
  Offer:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  Rejected: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
};

export default function ApplicationsPage() {
  const { user } = useAuth();

  // localStorage is client-only, so we read after mount to avoid any
  // server/client hydration mismatch. `ready` distinguishes "still loading"
  // from "genuinely empty".
  const [apps, setApps] = useState<Application[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setApps(user ? getApplicationsByEmail(user.email) : getApplications());
    setReady(true);
  }, [user]);

  const latest = apps[0] ?? null;

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold sm:text-3xl">My applications</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track the progress of every role you&apos;ve applied for.
        </p>

        {/* Returning-user greeting: surface their most recent application. */}
        {ready && user && latest && (
          <div className="mt-6 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm">
            Welcome back, {user.name || user.email}. Your last application was{" "}
            <span className="font-semibold">{latest.jobTitle}</span> at{" "}
            <span className="font-semibold">{latest.company}</span> —{" "}
            {latest.status}.
          </div>
        )}

        {ready && apps.length === 0 && (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#1a1133]">
            <Inbox className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
            <h2 className="mt-4 text-lg font-semibold">No applications yet</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              When you apply for a role it will show up here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Browse jobs
            </Link>
          </div>
        )}

        <ul className="mt-8 space-y-4">
          {apps.map((app) => (
            <li
              key={app.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{app.jobTitle}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {app.company}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full border px-3 py-1 text-xs font-semibold " +
                    PILL_CLASS[app.status]
                  }
                >
                  {app.status}
                </span>
              </div>

              {app.status === "Rejected" ? (
                <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                  Unfortunately this application was not successful. Keep going —
                  the right role is out there.
                </p>
              ) : (
                <ProgressTracker status={app.status} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function ProgressTracker({
  status,
}: {
  status: Exclude<ApplicationStatus, "Rejected">;
}) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="mt-6 flex items-center">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isLast = i === STEPS.length - 1;
        return (
          <li
            key={step}
            className={"flex items-center " + (isLast ? "" : "flex-1")}
          >
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
                  (done
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500")
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
                  (i < currentIndex
                    ? "bg-brand-600"
                    : "bg-slate-200 dark:bg-white/15")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
