// =============================================================
// src/app/recruiter/jobs/[jobId]/page.tsx
// Applicant-review screen for a single job (extra requirement).
// The recruiter sees every candidate who applied, their full details and
// cover letter (their "CV"), and can ACCEPT or REJECT each one. The decision
// is PATCHed to the server store, so the candidate's status reflects it.
// =============================================================
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Link2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useEmployerAuth } from "@/context/EmployerAuthContext";
import {
  fetchJobById,
  fetchApplicationsByJob,
  decideApplication,
} from "@/lib/api";
import type {
  RecruiterApplication,
  RecruiterDecisionStatus,
} from "@/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<RecruiterDecisionStatus, string> = {
  Submitted:
    "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  "Under review":
    "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  Accepted:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  Rejected: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
};

export default function RecruiterApplicantsPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const queryClient = useQueryClient();
  const { employer, ready: authReady } = useEmployerAuth();
  const ready = authReady && !!employer;

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobById(jobId),
    retry: false,
  });

  const {
    data: applicants,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["applicants", jobId],
    queryFn: () => fetchApplicationsByJob(jobId),
  });

  const decide = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: RecruiterDecisionStatus;
    }) => decideApplication(id, status),
    onSuccess: () => {
      // Re-read the applicant list from the source of truth so the new status
      // is reflected, and refresh the dashboard count view.
      queryClient.invalidateQueries({ queryKey: ["applicants", jobId] });
      queryClient.invalidateQueries({ queryKey: ["all-applications"] });
    },
  });

  if (!ready) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-white px-4 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Recruiter access only</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Please sign in to review applicants.
          </p>
          <Link
            href="/recruiter/signin"
            className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Recruiter sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/recruiter"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Applicants{job ? ` — ${job.title}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {applicants
            ? `${applicants.length} ${
                applicants.length === 1 ? "person has" : "people have"
              } applied for this role.`
            : "Loading applicants…"}
        </p>

        {isPending ? (
          <div className="mt-10 flex justify-center text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          </div>
        ) : isError ? (
          <p
            role="alert"
            className="mt-8 rounded-2xl border border-red-300 bg-red-50 px-6 py-8 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            {(error as Error).message}
          </p>
        ) : applicants.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#1a1133] dark:text-slate-400">
            No applications yet. As candidates apply from the job board, they
            will appear here for review.
          </p>
        ) : (
          <ul className="mt-8 space-y-5">
            {applicants.map((app) => (
              <ApplicantCard
                key={app.id}
                app={app}
                onDecide={(status) => decide.mutate({ id: app.id, status })}
                pending={decide.isPending && decide.variables?.id === app.id}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ApplicantCard({
  app,
  onDecide,
  pending,
}: {
  app: RecruiterApplication;
  onDecide: (status: RecruiterDecisionStatus) => void;
  pending: boolean;
}) {
  const decided = app.status === "Accepted" || app.status === "Rejected";

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{app.fullName}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Applied {new Date(app.submittedAt).toLocaleString()}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            STATUS_STYLE[app.status],
          )}
        >
          {app.status}
        </span>
      </div>

      {/* Candidate details */}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Detail icon={<Mail className="h-4 w-4" />} label="Email" value={app.email} />
        {app.phone && (
          <Detail icon={<Phone className="h-4 w-4" />} label="Phone" value={app.phone} />
        )}
        <Detail
          icon={<Briefcase className="h-4 w-4" />}
          label="Experience"
          value={`${app.yearsOfExperience} year${app.yearsOfExperience === 1 ? "" : "s"}`}
        />
        <Detail
          icon={<Clock className="h-4 w-4" />}
          label="Availability"
          value={
            app.availableImmediately
              ? "Immediately"
              : `${app.noticePeriodWeeks} week notice`
          }
        />
        {app.linkedInUrl && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Link2 className="h-4 w-4 text-brand-500" />
            <a
              href={app.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
            >
              LinkedIn profile
            </a>
          </div>
        )}
      </dl>

      {/* Cover letter — the candidate's CV / pitch. */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0f0a1e]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Cover letter
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
          {app.coverLetter}
        </p>
      </div>

      {/* Decision controls */}
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
        {pending ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onDecide("Accepted")}
              disabled={app.status === "Accepted"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
            >
              <CheckCircle2 className="h-4 w-4" /> Accept
            </button>
            <button
              type="button"
              onClick={() => onDecide("Rejected")}
              disabled={app.status === "Rejected"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
            {!decided && app.status !== "Under review" && (
              <button
                type="button"
                onClick={() => onDecide("Under review")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Move to review
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
      <span className="text-brand-500">{icon}</span>
      <span className="text-slate-400 dark:text-slate-500">{label}:</span>
      <span className="font-medium text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}
