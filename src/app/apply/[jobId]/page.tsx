// =============================================================
// src/app/apply/[jobId]/page.tsx
// Canonical job-application flow (Assignment 3.2) — hosts the 5-step
// JobApplicationWizard. Loads the job (real API with a local-store fallback),
// gates on a signed-in candidate, and blocks duplicate applications.
//
// The old single-page form lived here previously; the wizard replaces it as the
// single source of truth for applying. The embedded teaser on /jobs/[id] now
// links here.
// =============================================================
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { fetchJobById } from "@/lib/api";
import JobApplicationWizard from "@/components/apply/JobApplicationWizard";

interface ResolvedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  /** Backend gap (docs/BACKEND-GAPS.md §B.1): the API has no requiresDriversLicence
   *  flag yet, so we infer it from the role's skills/title as a stand-in. */
  requiresDriversLicence: boolean;
}

function inferLicence(haystack: string[]): boolean {
  return haystack.some((s) => /driver'?s?\s*licen[cs]e|valid licen/i.test(s));
}

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: session, status } = useSession();
  const ready = status !== "loading";

  const { data: apiJob, isPending, isError } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobById(jobId),
    retry: false,
  });

  const job = useMemo<ResolvedJob | null>(() => {
    if (!apiJob) return null;
    return {
      id: apiJob.id,
      title: apiJob.title,
      company: apiJob.company,
      location: apiJob.location,
      requiresDriversLicence: inferLicence([
        apiJob.title,
        apiJob.minimumQualification,
        ...apiJob.skills,
        ...apiJob.responsibilities,
      ]),
    };
  }, [apiJob]);

  const loading = isPending || !ready;

  if (loading) {
    return (
      <Centered>
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm">Loading this role…</p>
      </Centered>
    );
  }

  if (!job) {
    return (
      <Card>
        <h1 className="text-xl font-bold">Job not found</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {isError
            ? "This listing may have been removed or the link is incorrect."
            : "We couldn't load this listing. Please try again."}
        </p>
        <Link href="/jobs" className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Browse jobs
        </Link>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold">Sign in to apply</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          You need a job-seeker account to apply for{" "}
          <span className="font-medium text-slate-900 dark:text-white">{job.title}</span>.
        </p>
        <Link
          href={`/candidate/signin?next=/apply/${job.id}`}
          className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Sign in
        </Link>
      </Card>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to the role
        </Link>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Apply for {job.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {job.company} · {job.location}
        </p>

        <div className="mt-8">
          <JobApplicationWizard
            job={{
              id: job.id,
              title: job.title,
              company: job.company,
              requiresDriversLicence: job.requiresDriversLicence,
            }}
            user={{
              name: session.user.name || session.user.email || "",
              email: session.user.email || "",
            }}
            token={session.accessToken}
          />
        </div>
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-white px-4 py-16 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
        {children}
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[70vh] bg-white px-4 py-16 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1a1133]">
        {children}
      </div>
    </main>
  );
}
