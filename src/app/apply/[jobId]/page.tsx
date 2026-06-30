// =============================================================
// src/app/apply/[jobId]/page.tsx
// Application form for a single job. Reads the job by id from the
// client-side store, validates every field, and on success records
// the application and shows a confirmation with a tracking link.
//
// Assignment 3.2 additions:
//   • AUTO-FILL — name/email/phone/ID/nationality are pre-filled from the
//     signed-in user's saved profile (profile-store), so applying never starts
//     from a blank page. Saved qualification PDFs can be attached in one click.
//   • RESUME — every change is saved to a per-job DRAFT. If the user leaves
//     without submitting, their answers are restored on return (and surfaced by
//     the "unfinished application" banner elsewhere). The draft is cleared on a
//     successful submit.
// =============================================================
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileText,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Sparkles,
  History,
  UserCircle,
} from "lucide-react";
import {
  getJobById,
  saveApplication,
  hasApplied,
  uid,
  type Application,
} from "@/lib/careerhub-store";
import {
  getProfile,
  getDraft,
  saveDraft,
  clearDraft,
  QUALIFICATION_LABELS,
  type ApplicantProfile,
  type QualificationKey,
} from "@/lib/profile-store";
import { fetchJobById } from "@/lib/api";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employmentType";
import { useAuth } from "@/context/AuthContext";

interface ApplyJob {
  id: string;
  title: string;
  company: string;
  location: string;
  typeLabel: string;
  requiredSkill: string;
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";

type Errors = Record<string, string>;

export default function ApplyPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const { user } = useAuth();

  const {
    data: apiJob,
    isPending: apiPending,
    isError: apiError,
  } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobById(jobId),
    retry: false,
  });

  const localJob = useMemo(() => getJobById(jobId), [jobId]);

  const job = useMemo<ApplyJob | null>(() => {
    if (apiJob) {
      return {
        id: apiJob.id,
        title: apiJob.title,
        company: apiJob.company,
        location: apiJob.location,
        typeLabel: EMPLOYMENT_TYPE_LABELS[apiJob.employmentType],
        requiredSkill:
          apiJob.skills[0] ??
          (apiJob.minimumQualification.trim() || "the listed requirements"),
      };
    }
    if (localJob) {
      return {
        id: localJob.id,
        title: localJob.title,
        company: localJob.company,
        location: localJob.location,
        typeLabel: localJob.type,
        requiredSkill: localJob.requiredSkill,
      };
    }
    return null;
  }, [apiJob, localJob]);

  const isLoading = apiPending && !localJob;
  const notFound = apiError && !localJob;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [hasSkill, setHasSkill] = useState<boolean | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  /** Display/validation name for the CV — set by an upload OR by attaching
   *  profile documents. Decoupled from the File so it can be restored from a draft. */
  const [cvName, setCvName] = useState("");
  const [usingProfileDocs, setUsingProfileDocs] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [restored, setRestored] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Guards so the one-time load and the autosave behave predictably.
  const loadedRef = useRef(false);
  const baselineRef = useRef("");

  // The profile documents available to attach (uploaded PDFs only).
  const profileDocs = useMemo(() => {
    if (!profile) return [] as { key: QualificationKey; name: string }[];
    return (Object.keys(QUALIFICATION_LABELS) as QualificationKey[])
      .map((key) => ({ key, doc: profile.qualifications[key] }))
      .filter((x) => x.doc)
      .map((x) => ({ key: x.key, name: x.doc!.fileName }));
  }, [profile]);

  // ---- one-time load: restore a draft, else pre-fill from the profile -------
  useEffect(() => {
    if (!user || !job || loadedRef.current) return;
    loadedRef.current = true;

    const prof = getProfile(user.email);
    setProfile(prof);

    const draft = getDraft(user.email, job.id);
    const snapshot = {
      fullName: "",
      email: "",
      phone: "",
      nationality: "",
      idNumber: "",
      hasSkill: null as boolean | null,
      cvName: "",
      acceptedTerms: false,
    };

    if (draft) {
      const v = draft.values;
      setFullName((snapshot.fullName = v.fullName ?? ""));
      setEmail((snapshot.email = v.email ?? ""));
      setPhone((snapshot.phone = v.phone ?? ""));
      setNationality((snapshot.nationality = v.nationality ?? ""));
      setIdNumber((snapshot.idNumber = v.idNumber ?? ""));
      setHasSkill((snapshot.hasSkill = v.hasSkill ?? null));
      setCvName((snapshot.cvName = v.cvFileName ?? ""));
      setAcceptedTerms((snapshot.acceptedTerms = v.acceptedTerms ?? false));
      setRestored(true);
    } else if (prof) {
      setFullName((snapshot.fullName = prof.personal.fullName || user.name));
      setEmail((snapshot.email = prof.personal.email || user.email));
      setPhone((snapshot.phone = prof.personal.phone));
      setNationality((snapshot.nationality = prof.personal.nationality));
      setIdNumber((snapshot.idNumber = prof.personal.idNumber));
      setPrefilled(true);
    } else {
      setFullName((snapshot.fullName = user.name));
      setEmail((snapshot.email = user.email));
    }

    // Baseline = what we loaded. The autosave below only writes a draft once the
    // user changes something, so a fresh, untouched pre-fill never creates one.
    baselineRef.current = JSON.stringify(snapshot);
  }, [user, job]);

  // Early "already applied" notice for the signed-in case.
  useEffect(() => {
    if (user && job && hasApplied(job.id, user.email)) {
      setAlreadyApplied(true);
    }
  }, [user, job]);

  // ---- autosave the draft on any meaningful change --------------------------
  useEffect(() => {
    if (!user || !job || submitted || alreadyApplied) return;
    const snapshot = JSON.stringify({
      fullName,
      email,
      phone,
      nationality,
      idNumber,
      hasSkill,
      cvName,
      acceptedTerms,
    });
    if (snapshot === baselineRef.current) return; // nothing changed yet
    saveDraft({
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      email: user.email,
      values: { fullName, email, phone, nationality, idNumber, hasSkill, cvFileName: cvName, acceptedTerms },
    });
  }, [
    user,
    job,
    submitted,
    alreadyApplied,
    fullName,
    email,
    phone,
    nationality,
    idNumber,
    hasSkill,
    cvName,
    acceptedTerms,
  ]);

  function attachProfileDocs(on: boolean) {
    setUsingProfileDocs(on);
    if (on) {
      setCvFile(null);
      setCvName(
        `Profile documents (${profileDocs.map((d) => QUALIFICATION_LABELS[d.key]).join(", ")})`,
      );
    } else {
      setCvName("");
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-white px-4 py-16 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm">Loading this role…</p>
        </div>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-[70vh] bg-white px-4 py-16 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1a1133]">
          <h1 className="text-xl font-bold">Job not found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {notFound
              ? "This listing may have been removed or the link is incorrect."
              : "We couldn't load this listing. Please try again."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse jobs
          </Link>
        </div>
      </main>
    );
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = "Please enter your full name.";
    if (!email.trim()) next.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Please enter a valid email address.";
    if (!phone.trim()) next.phone = "Please enter your phone number.";
    if (!nationality.trim()) next.nationality = "Please enter your nationality.";
    if (!idNumber.trim()) next.idNumber = "Please enter your ID number.";
    if (hasSkill === null)
      next.hasSkill = "Please tell us whether you have the required skill.";
    // CV satisfied by a fresh PDF upload OR by attaching saved profile documents.
    if (!cvName) next.cv = "Please attach your CV (PDF) or your profile documents.";
    else if (cvFile && cvFile.type !== "application/pdf")
      next.cv = "Your CV must be a PDF file.";
    if (!acceptedTerms)
      next.terms = "You must accept the terms and conditions.";
    return next;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (hasApplied(job!.id, email.trim())) {
      setAlreadyApplied(true);
      return;
    }

    const application: Application = {
      id: uid(),
      jobId: job!.id,
      jobTitle: job!.title,
      company: job!.company,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      nationality: nationality.trim(),
      idNumber: idNumber.trim(),
      hasRequiredSkill: hasSkill === true,
      cvFileName: cvName,
      acceptedTerms,
      status: "Submitted",
      appliedAt: new Date().toISOString(),
    };
    saveApplication(application);
    // The application is in — drop the saved draft so the resume banner clears.
    if (user) clearDraft(user.email, job!.id);
    setSubmitted(true);
  }

  if (alreadyApplied && !submitted) {
    return (
      <main className="min-h-[70vh] bg-white px-4 py-16 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1a1133]">
          <AlertCircle className="mx-auto h-14 w-14 text-amber-500" />
          <h1 className="mt-4 text-2xl font-bold">You have already applied</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            You&apos;ve already submitted an application for{" "}
            <span className="font-medium text-slate-900 dark:text-white">{job.title}</span> at{" "}
            <span className="font-medium text-slate-900 dark:text-white">{job.company}</span>.
            You can only apply to each role once.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/applications" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              Track my application
            </Link>
            <Link href="/" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10">
              Browse more jobs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-[70vh] bg-white px-4 py-16 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1a1133]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-brand-500" />
          <h1 className="mt-4 text-2xl font-bold">Application submitted</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your application for{" "}
            <span className="font-medium text-slate-900 dark:text-white">{job.title}</span> at{" "}
            <span className="font-medium text-slate-900 dark:text-white">{job.company}</span> has
            been received. We&apos;ll keep you posted as it moves through the stages.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/applications" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              Track my application
            </Link>
            <Link href="/" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10">
              Browse more jobs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Apply for {job.title} at {job.company}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {job.location} · {job.typeLabel}
        </p>

        {/* Restored-draft banner */}
        {restored && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
            <History className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-300" />
            <p className="text-amber-800 dark:text-amber-200">
              Welcome back — we restored the answers you started earlier. Pick up
              where you left off.
            </p>
          </div>
        )}

        {/* Auto-fill banner */}
        {prefilled && !restored && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand-500/40 bg-brand-50 px-4 py-3 text-sm dark:border-brand-800/60 dark:bg-brand-900/30">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-100" />
            <p className="text-brand-800 dark:text-brand-100">
              We pre-filled this form from your{" "}
              <Link href="/profile" className="font-semibold underline">profile</Link>. Review it,
              attach your documents, and submit.
            </p>
          </div>
        )}

        {/* Nudge to build a profile when none exists */}
        {user && !profile && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
            <UserCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
            <p className="text-slate-600 dark:text-slate-300">
              Tip: <Link href="/profile" className="font-semibold underline">build your profile</Link>{" "}
              once and future applications fill themselves in.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate
          className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]">
          <Field id="fullName" label="Full name" value={fullName} onChange={setFullName} autoComplete="name" error={errors.fullName} />
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" error={errors.email} />
          <Field id="phone" label="Phone" type="tel" value={phone} onChange={setPhone} autoComplete="tel" error={errors.phone} />
          <Field id="nationality" label="Nationality" value={nationality} onChange={setNationality} error={errors.nationality} />
          <Field id="idNumber" label="ID number" value={idNumber} onChange={setIdNumber} error={errors.idNumber} />

          {/* Required skill callout + Yes/No toggle */}
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
            <p className="text-sm">
              This role requires:{" "}
              <span className="font-semibold text-brand-700 dark:text-brand-300">{job.requiredSkill}</span>
            </p>
            <fieldset className="mt-3">
              <legend className="text-sm font-medium">Do you have this required skill?</legend>
              <div className="mt-2 flex gap-2">
                {(["Yes", "No"] as const).map((label) => {
                  const value = label === "Yes";
                  const active = hasSkill === value;
                  return (
                    <button key={label} type="button" aria-pressed={active} onClick={() => setHasSkill(value)}
                      className={
                        "rounded-lg border px-5 py-2 text-sm font-semibold transition " +
                        (active
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-[#0f0a1e] dark:text-slate-300 dark:hover:bg-white/10")
                      }>
                      {label}
                    </button>
                  );
                })}
              </div>
              {errors.hasSkill && <p className="mt-2 text-xs text-red-500 dark:text-red-400">{errors.hasSkill}</p>}
            </fieldset>
          </div>

          {/* Attach saved profile documents (only when the profile has some) */}
          {profileDocs.length > 0 && (
            <label className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/20">
              <input type="checkbox" checked={usingProfileDocs}
                onChange={(e) => attachProfileDocs(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40 dark:border-white/20 dark:bg-[#0f0a1e]" />
              <span className="text-slate-700 dark:text-slate-200">
                Attach my saved documents from my profile
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {profileDocs.map((d) => QUALIFICATION_LABELS[d.key]).join(", ")}
                </span>
              </span>
            </label>
          )}

          {/* CV upload (PDF only) — hidden when using profile documents */}
          {!usingProfileDocs && (
            <div>
              <label htmlFor="cv" className="block text-sm font-medium">Upload your CV (PDF)</label>
              <input id="cv" type="file" accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setCvFile(f);
                  setCvName(f?.name ?? "");
                }}
                className="mt-1.5 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700 dark:text-slate-400" />
            </div>
          )}
          {cvName && (
            <p className="-mt-2 inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <FileText className="h-4 w-4 text-brand-500" /> {cvName}
            </p>
          )}
          {errors.cv && <p className="text-xs text-red-500 dark:text-red-400">{errors.cv}</p>}

          {/* Terms */}
          <div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40 dark:border-white/20 dark:bg-[#0f0a1e]" />
              <span className="text-slate-600 dark:text-slate-300">
                I accept the terms and conditions and consent to my information being shared with {job.company}.
              </span>
            </label>
            {errors.terms && <p className="mt-2 text-xs text-red-500 dark:text-red-400">{errors.terms}</p>}
          </div>

          <button type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133]">
            Submit application
          </button>
        </form>
      </div>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
}

function Field({ id, label, value, onChange, type = "text", autoComplete, error }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input id={id} type={type} autoComplete={autoComplete} value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined} className={inputClass} />
      {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
