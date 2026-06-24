"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2, FileText, UserCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { submitApplication } from "@/lib/api";

/**
 * RealApplyPanel — the apply form on /jobs/[id].
 *
 * Assignment 2.2 makes this self-contained on the IN-APP API: it is gated on the
 * in-app candidate session (useAuth → /api/auth) and submits to the in-app
 * POST /api/applications, which persists to the same store the stats endpoint
 * counts. That removes the dependency on the external Docker backend (whose cold
 * start used to make this page error out / "not let me apply"), and every
 * submission bumps the dashboard's Total Applications.
 */
const MAX_CV_BYTES = 5 * 1024 * 1024;

export default function RealApplyPanel({
  jobId,
  jobTitle,
  requiredSkills,
}: {
  jobId: string;
  jobTitle: string;
  requiredSkills: string[];
}) {
  const { user, isReady } = useAuth();
  const router = useRouter();

  const [coverNote, setCoverNote] = useState("");
  const [skills, setSkills] = useState<Set<string>>(new Set());
  const [cv, setCv] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!isReady) return null;

  // Signed-out: invite the candidate to sign in, returning to this job after.
  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          <UserCircle className="h-5 w-5" />
        </span>
        <h2 className="mt-3 font-display text-lg font-bold text-ink dark:text-slate-100">
          Sign in to apply
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Create a free job-seeker account (or sign in) to apply for{" "}
          <span className="font-semibold">{jobTitle}</span> and track your
          applications.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Sign in to apply
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="mt-3 font-display text-lg font-bold text-ink dark:text-slate-100">
          Application submitted
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">
          Your application for <span className="font-semibold">{jobTitle}</span>{" "}
          is in. The employer will see it on their dashboard.
        </p>
        <Link
          href="/jobs"
          className="mt-4 inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Browse more roles
        </Link>
      </div>
    );
  }

  function toggleSkill(skill: string) {
    setSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }

  function onCvChange(file: File | null) {
    setError(null);
    if (!file) {
      setCv(null);
      return;
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Your CV must be a PDF file.");
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setError("Your CV must be 5 MB or smaller.");
      return;
    }
    setCv(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (coverNote.trim().length < 20) {
      setError("Please write a short cover note (at least 20 characters).");
      return;
    }
    setBusy(true);
    try {
      // Submit to the in-app API (server-store). The selected skills are folded
      // into the cover letter so the recruiter still sees them, since the lean
      // ApplicationRequest contract has no dedicated skills field.
      const skillLine =
        skills.size > 0 ? `\n\nMatched skills: ${[...skills].join(", ")}.` : "";
      await submitApplication({
        jobId,
        fullName: user!.name,
        email: user!.email,
        phone: "",
        yearsOfExperience: 0,
        coverLetter: coverNote.trim() + skillLine + (cv ? `\n\nCV: ${cv.name}` : ""),
        availableImmediately: true,
        noticePeriodWeeks: 0,
      });
      setDone(true);
      // Refresh any server data that depends on application counts.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
        Apply for this role
      </h2>
      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        Signed in as {user.email}
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      {requiredSkills.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-ink dark:text-slate-200">
            Which of these required skills do you have?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {requiredSkills.map((skill) => {
              const checked = skills.has(skill);
              return (
                <label
                  key={skill}
                  className={
                    checked
                      ? "inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-500 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
                      : "inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSkill(skill)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  {skill}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-5">
        <label htmlFor="coverNote" className="block text-sm font-medium text-ink dark:text-slate-200">
          Cover note
        </label>
        <textarea
          id="coverNote"
          rows={4}
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          placeholder="Tell the recruiter why you're a strong fit…"
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </div>

      <div className="mt-5">
        <label className="block text-sm font-medium text-ink dark:text-slate-200">
          CV / Résumé (PDF, optional)
        </label>
        <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 transition hover:border-brand-400 dark:border-slate-600 dark:text-slate-300">
          <FileText className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <span className="truncate">
            {cv ? cv.name : "Click to attach a PDF (max 5 MB)"}
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => onCvChange(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
