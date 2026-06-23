// =============================================================
// src/app/recruiter/jobs/[jobId]/page.tsx
// Applicant-review screen for one job, wired to the REAL backend.
// The recruiter sees every candidate who applied — their details, the
// minimum skills they ticked, their cover note and CV (PDF) — and can
// move each application to Under Review, Accept (Offered) or Reject. The
// change is PATCHed to the backend and the candidate sees it in Track.
// =============================================================
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { useEmployerAuth } from "@/context/EmployerAuthContext";
import { fetchJobById } from "@/lib/api";
import {
  fetchJobApplications,
  updateApplicationStatus,
  openApplicantCv,
  type JobApplication,
  type ReviewStatus,
} from "@/lib/employer-api";

const STAGE_STYLE: Record<string, string> = {
  Applied: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  Pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  Accepted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  Rejected: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
};

export default function RecruiterApplicantsPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const { employer, ready } = useEmployerAuth();

  const [jobTitle, setJobTitle] = useState<string>("");
  const [apps, setApps] = useState<JobApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employer) return;
    setError(null);
    try {
      const [job, list] = await Promise.all([
        fetchJobById(jobId).catch(() => null),
        fetchJobApplications(employer.token, jobId),
      ]);
      if (job) setJobTitle(job.title);
      setApps(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load applicants.");
      setApps([]);
    }
  }, [employer, jobId]);

  useEffect(() => {
    if (ready && employer) load();
  }, [ready, employer, load]);

  async function decide(applicantId: string, status: ReviewStatus) {
    if (!employer) return;
    setBusyId(applicantId);
    setError(null);
    try {
      await updateApplicationStatus(employer.token, jobId, applicantId, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update status.");
    } finally {
      setBusyId(null);
    }
  }

  async function viewCv(applicantId: string) {
    if (!employer) return;
    try {
      await openApplicantCv(employer.token, jobId, applicantId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the CV.");
    }
  }

  if (!ready) return null;

  if (!employer) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-white px-4 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Employer access only</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Please sign in to review applicants.
          </p>
          <Link
            href="/recruiter/signin"
            className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Employer sign in
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
          Applicants{jobTitle ? ` — ${jobTitle}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {apps === null
            ? "Loading applicants…"
            : `${apps.length} ${apps.length === 1 ? "person has" : "people have"} applied for this role.`}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {apps === null ? (
          <div className="mt-10 flex justify-center text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          </div>
        ) : apps.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#1a1133] dark:text-slate-400">
            No applications yet. As candidates apply from the job board, they will
            appear here for review.
          </p>
        ) : (
          <ul className="mt-8 space-y-5">
            {apps.map((app) => (
              <ApplicantCard
                key={app.applicantId}
                app={app}
                busy={busyId === app.applicantId}
                onDecide={(status) => decide(app.applicantId, status)}
                onViewCv={() => viewCv(app.applicantId)}
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
  busy,
  onDecide,
  onViewCv,
}: {
  app: JobApplication;
  busy: boolean;
  onDecide: (status: ReviewStatus) => void;
  onViewCv: () => void;
}) {
  const terminal = app.status === "Offered" || app.status === "Rejected";

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
          className={
            "rounded-full border px-3 py-1 text-xs font-semibold " +
            (STAGE_STYLE[app.stage] ?? STAGE_STYLE.Applied)
          }
        >
          {app.stage} · {app.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Detail icon={<Mail className="h-4 w-4" />} label="Email" value={app.email} />
        {app.city && <Detail icon={<MapPin className="h-4 w-4" />} label="City" value={app.city} />}
        <Detail
          icon={<Briefcase className="h-4 w-4" />}
          label="Experience"
          value={`${app.yearsOfExperience} year${app.yearsOfExperience === 1 ? "" : "s"}`}
        />
      </dl>

      {app.selectedSkills.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Skills they have
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {app.selectedSkills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0f0a1e]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Cover note
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
          {app.coverNote || "—"}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {app.hasCv ? (
          <button
            type="button"
            onClick={onViewCv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Eye className="h-4 w-4" /> View CV
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
            <FileText className="h-4 w-4" /> No CV attached
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
        {busy ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </span>
        ) : terminal ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Decision recorded: <span className="font-semibold">{app.status}</span>
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onDecide("UnderReview")}
              disabled={app.status === "UnderReview"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Under review
            </button>
            <button
              type="button"
              onClick={() => onDecide("Offered")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Accept
            </button>
            <button
              type="button"
              onClick={() => onDecide("Rejected")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
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
      <span className="font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}
