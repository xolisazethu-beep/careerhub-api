// =============================================================
// src/app/apply/[jobId]/page.tsx
// Application form for a single job. Reads the job by id from the
// client-side store, validates every field, and on success records
// the application and shows a confirmation with a tracking link.
// Prefills name/email from the signed-in user so their applications
// stay tied to their account.
// =============================================================
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, FileText, ArrowLeft } from "lucide-react";
import {
  getJobById,
  saveApplication,
  uid,
  type Application,
} from "@/lib/careerhub-store";
import { useAuth } from "@/context/AuthContext";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";

type Errors = Record<string, string>;

export default function ApplyPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const { user } = useAuth();

  // Resolve the job once per id. getJobById reads localStorage, so this is a
  // client-only lookup; on the first render before hydration it simply returns
  // whatever the store has (or null).
  const job = useMemo(() => getJobById(jobId), [jobId]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [hasSkill, setHasSkill] = useState<boolean | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  // Prefill from the signed-in account so the application is linked to them.
  useEffect(() => {
    if (user) {
      setFullName((v) => v || user.name);
      setEmail((v) => v || user.email);
    }
  }, [user]);

  if (!job) {
    return (
      <main className="min-h-[70vh] bg-white px-4 py-16 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1a1133]">
          <h1 className="text-xl font-bold">Job not found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            This listing may have been removed or the link is incorrect.
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
    if (!cvFile) next.cv = "Please attach your CV as a PDF.";
    else if (cvFile.type !== "application/pdf")
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
      cvFileName: cvFile!.name,
      acceptedTerms,
      status: "Submitted",
      appliedAt: new Date().toISOString(),
    };
    saveApplication(application);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-[70vh] bg-white px-4 py-16 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1a1133]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-brand-500" />
          <h1 className="mt-4 text-2xl font-bold">Application submitted</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your application for{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {job.title}
            </span>{" "}
            at{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              {job.company}
            </span>{" "}
            has been received. We&apos;ll keep you posted as it moves through
            the stages.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/applications"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Track my application
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
            >
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
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Apply for {job.title} at {job.company}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {job.location} · {job.type}
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]"
        >
          <Field
            id="fullName"
            label="Full name"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
            error={errors.fullName}
          />
          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            error={errors.email}
          />
          <Field
            id="phone"
            label="Phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            error={errors.phone}
          />
          <Field
            id="nationality"
            label="Nationality"
            value={nationality}
            onChange={setNationality}
            error={errors.nationality}
          />
          <Field
            id="idNumber"
            label="ID number"
            value={idNumber}
            onChange={setIdNumber}
            error={errors.idNumber}
          />

          {/* Required skill callout + Yes/No toggle */}
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
            <p className="text-sm">
              This role requires:{" "}
              <span className="font-semibold text-brand-700 dark:text-brand-300">
                {job.requiredSkill}
              </span>
            </p>
            <fieldset className="mt-3">
              <legend className="text-sm font-medium">
                Do you have this required skill?
              </legend>
              <div className="mt-2 flex gap-2">
                {(["Yes", "No"] as const).map((label) => {
                  const value = label === "Yes";
                  const active = hasSkill === value;
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setHasSkill(value)}
                      className={
                        "rounded-lg border px-5 py-2 text-sm font-semibold transition " +
                        (active
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-[#0f0a1e] dark:text-slate-300 dark:hover:bg-white/10")
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {errors.hasSkill && (
                <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                  {errors.hasSkill}
                </p>
              )}
            </fieldset>
          </div>

          {/* CV upload (PDF only) */}
          <div>
            <label htmlFor="cv" className="block text-sm font-medium">
              Upload your CV (PDF)
            </label>
            <input
              id="cv"
              type="file"
              accept="application/pdf"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700 dark:text-slate-400"
            />
            {cvFile && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <FileText className="h-4 w-4 text-brand-500" />
                {cvFile.name}
              </p>
            )}
            {errors.cv && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                {errors.cv}
              </p>
            )}
          </div>

          {/* Terms */}
          <div>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40 dark:border-white/20 dark:bg-[#0f0a1e]"
              />
              <span className="text-slate-600 dark:text-slate-300">
                I accept the terms and conditions and consent to my information
                being shared with {job.company}.
              </span>
            </label>
            {errors.terms && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                {errors.terms}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133]"
          >
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

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={inputClass}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
