"use client";

// =============================================================
// src/components/ApplicationWizard.tsx
// Assignment 3.1, Part 3 (+ Part 4b discard dialog, + Stretch A/B/C).
//
// A three-step application wizard that replaces the single-page form's UX:
//   1) Your details      — full name, email, phone (optional)
//   2) Your application   — cover letter (opt), LinkedIn URL (opt), source
//   3) Review & submit    — read-only summary of every field
//
// • One Zod schema validates everything; a cross-step refine enforces the
//   LinkedIn URL format. Step navigation uses trigger() with an explicit field
//   list per step, so Next validates ONLY the current step.
// • The form auto-saves to localStorage (key `careerhub-application-${jobId}`)
//   on every field/step change via a form.watch() subscription, and restores on
//   mount with a dismissible banner.
// • Stretch A: a `storage` listener keeps the draft in sync across tabs.
// • Stretch B: CSS slide transitions between steps (direction-aware).
// • Stretch C: a best-effort LinkedIn preview under the URL field.
// =============================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  History,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ---- schema (single source of truth for all three steps) ------------------
const LINKEDIN_RE = /^https:\/\/(www\.)?linkedin\.com\//i;

const SOURCES = [
  "LinkedIn",
  "A job board",
  "A referral",
  "The company website",
  "Social media",
  "Other",
] as const;

const wizardSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Please enter your full name (at least 2 characters)."),
    email: z.email("Enter a valid email address."),
    // Optional: a value OR blank.
    phone: z
      .string()
      .regex(/^\+?[\d\s\-()]{8,15}$/, "Enter a valid phone number.")
      .or(z.literal(""))
      .optional(),
    coverLetter: z
      .string()
      .max(2000, "Keep your cover letter under 2000 characters.")
      .or(z.literal(""))
      .optional(),
    linkedinUrl: z.string().or(z.literal("")).optional(),
    source: z.string().min(1, "Please tell us how you heard about this role."),
  })
  // Cross-step rule: if a LinkedIn URL is given it must be a real LinkedIn URL.
  // The error attaches to linkedinUrl so it renders next to that field.
  .refine((d) => !d.linkedinUrl || LINKEDIN_RE.test(d.linkedinUrl), {
    message: "Must start with https://linkedin.com/ or https://www.linkedin.com/",
    path: ["linkedinUrl"],
  });

type WizardValues = z.infer<typeof wizardSchema>;

const EMPTY: WizardValues = {
  fullName: "",
  email: "",
  phone: "",
  coverLetter: "",
  linkedinUrl: "",
  source: "",
};

// Fields validated by trigger() at each step. Step 3 has no inputs.
const STEP_FIELDS: (keyof WizardValues)[][] = [
  ["fullName", "email", "phone"],
  ["coverLetter", "linkedinUrl", "source"],
  [],
];

const STEP_LABELS = ["Your details", "Your application", "Review & submit"];

const inputClass =
  "mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 focus:ring-brand-500/30 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";
const okBorder = "border-slate-300 focus:border-brand-500 dark:border-white/10";
const errBorder = "border-red-500 focus:border-red-500 dark:border-red-500/70";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-200";
const errText = "mt-1.5 text-xs text-red-600 dark:text-red-400";

interface ApplicationWizardProps {
  jobId: string;
  jobTitle: string;
  /** True only when the viewer is signed in as a candidate. Controls the
   *  "must be signed in to advance" gate (Part 3). */
  isCandidate: boolean;
}

export default function ApplicationWizard({
  jobId,
  jobTitle,
  isCandidate,
}: ApplicationWizardProps) {
  const storageKey = `careerhub-application-${jobId}`;

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [hasDraft, setHasDraft] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [showSignInGate, setShowSignInGate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: EMPTY,
    mode: "onTouched",
  });
  const { register, trigger, getValues, reset, watch, formState } = form;
  const errors = formState.errors;

  // Writing the draft from within an effect must not itself trip the "restored"
  // banner, so we guard programmatic writes.
  const skipNextWrite = useRef(false);

  // ---- restore on mount -----------------------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<WizardValues>;
        skipNextWrite.current = true;
        reset({ ...EMPTY, ...saved });
        setHasDraft(true);
        setShowRestored(true);
      }
    } catch {
      /* ignore malformed draft */
    }
  }, [storageKey, reset]);

  // ---- auto-save on every change (form.watch subscription) ------------------
  useEffect(() => {
    const sub = watch((values) => {
      if (skipNextWrite.current) {
        skipNextWrite.current = false;
        return;
      }
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(values));
        setHasDraft(true);
      } catch {
        /* storage full / unavailable — non-fatal */
      }
    });
    // watch() returns a subscription; unsubscribe on cleanup so it doesn't leak
    // or fire after unmount.
    return () => sub.unsubscribe();
  }, [watch, storageKey]);

  // ---- Stretch A: cross-tab sync via the storage event ----------------------
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== storageKey) return;
      if (e.newValue) {
        try {
          const saved = JSON.parse(e.newValue) as Partial<WizardValues>;
          skipNextWrite.current = true;
          reset({ ...EMPTY, ...saved });
          setHasDraft(true);
          setShowRestored(true);
        } catch {
          /* ignore */
        }
      } else {
        // The draft was discarded in another tab → mirror that here.
        skipNextWrite.current = true;
        reset(EMPTY);
        setHasDraft(false);
        setShowRestored(false);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey, reset]);

  function persistNow() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(getValues()));
      setHasDraft(true);
    } catch {
      /* non-fatal */
    }
  }

  // ---- navigation -----------------------------------------------------------
  async function next() {
    // Gate: a non-candidate cannot advance past step 1.
    if (step === 0 && !isCandidate) {
      setShowSignInGate(true);
      return;
    }
    const valid = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (!valid) return;
    persistNow(); // save on step change
    setDirection("forward");
    setStep((s) => Math.min(s + 1, 2));
  }

  function back() {
    // Intentionally NO validation here — see README. Going back must always work.
    persistNow();
    setDirection("back");
    setStep((s) => Math.max(s - 1, 0));
  }

  // ---- submit ---------------------------------------------------------------
  async function onSubmit() {
    const valid = await trigger();
    if (!valid) return;
    setSubmitting(true);
    // No real backend for this wizard — simulate the request, then confirm.
    await new Promise((r) => setTimeout(r, 700));
    window.localStorage.removeItem(storageKey); // clear the draft on success
    setHasDraft(false);
    setShowRestored(false);
    setSubmitting(false);
    setSubmitted(true);
    toast.success("Application submitted", {
      description: `Your application for ${jobTitle} is on its way.`,
    });
    // Reset the wizard back to an empty step 1.
    skipNextWrite.current = true;
    reset(EMPTY);
    setStep(0);
  }

  // ---- discard (Part 4b) ----------------------------------------------------
  function discardDraft() {
    window.localStorage.removeItem(storageKey);
    skipNextWrite.current = true;
    reset(EMPTY);
    setHasDraft(false);
    setShowRestored(false);
    setStep(0);
    setDiscardOpen(false);
    toast.info("Draft discarded");
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800/60 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="font-display text-lg font-bold text-emerald-900 dark:text-emerald-200">
              Application submitted
            </h3>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
              Your application for <span className="font-semibold">{jobTitle}</span>{" "}
              has been received.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-4 rounded-lg border border-emerald-500/50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              Start another application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section id="application-wizard" className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-ink dark:text-slate-100">
            Apply for this role
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{jobTitle}</p>
        </div>
        {/* Part 4b — only shown when a draft exists. */}
        {hasDraft && (
          <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Discard draft
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard your draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your saved application progress will be permanently deleted.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep draft</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    discardDraft();
                  }}
                >
                  Discard draft
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Restored-draft banner (dismissible) */}
      {showRestored && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
          <History className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="flex-1 text-amber-800 dark:text-amber-200">
            You have a saved draft for this application. Restored automatically.
          </p>
          <button
            type="button"
            onClick={() => setShowRestored(false)}
            aria-label="Dismiss"
            className="text-amber-700/70 hover:text-amber-900 dark:text-amber-300/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stepper */}
      <ol className="mt-5 flex items-center">
        {STEP_LABELS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          const isLast = i === STEP_LABELS.length - 1;
          return (
            <li key={label} className={cn("flex items-center", !isLast && "flex-1")}>
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    active
                      ? "border-brand-600 bg-brand-600 text-white"
                      : done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white text-slate-400 dark:border-white/15 dark:bg-[#0f0a1e] dark:text-slate-500",
                  )}
                >
                  {done ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "mt-1.5 w-24 text-center text-[11px] font-medium leading-tight",
                    active || done
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400 dark:text-slate-500",
                  )}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1 -mt-6 h-0.5 flex-1",
                    i < step ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/15",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Step body — overflow-hidden so the slide can't spill (Stretch B). */}
      <div className="mt-6 overflow-hidden">
        <div
          key={step}
          className={direction === "forward" ? "wizard-slide-right" : "wizard-slide-left"}
        >
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className={labelClass}>Full name</label>
                <input id="fullName" autoComplete="name"
                  className={cn(inputClass, errors.fullName ? errBorder : okBorder)}
                  {...register("fullName")} />
                {errors.fullName && <p className={errText}>{errors.fullName.message}</p>}
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>Email address</label>
                <input id="email" type="email" autoComplete="email"
                  className={cn(inputClass, errors.email ? errBorder : okBorder)}
                  {...register("email")} />
                {errors.email && <p className={errText}>{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone number <span className="text-slate-400">(optional)</span>
                </label>
                <input id="phone" type="tel" autoComplete="tel"
                  className={cn(inputClass, errors.phone ? errBorder : okBorder)}
                  {...register("phone")} />
                {errors.phone && <p className={errText}>{errors.phone.message}</p>}
              </div>

              {showSignInGate && !isCandidate && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                  You need to be signed in as a candidate to apply.{" "}
                  <Link href="/login" className="font-semibold underline">Sign in here.</Link>
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="coverLetter" className={labelClass}>
                  Cover letter <span className="text-slate-400">(optional)</span>
                </label>
                <textarea id="coverLetter" rows={5}
                  placeholder="Tell us why you're a strong fit…"
                  className={cn(inputClass, errors.coverLetter ? errBorder : okBorder)}
                  {...register("coverLetter")} />
                {errors.coverLetter && <p className={errText}>{errors.coverLetter.message}</p>}
              </div>
              <div>
                <label htmlFor="linkedinUrl" className={labelClass}>
                  LinkedIn profile <span className="text-slate-400">(optional)</span>
                </label>
                <input id="linkedinUrl" type="url"
                  placeholder="https://www.linkedin.com/in/you"
                  className={cn(inputClass, errors.linkedinUrl ? errBorder : okBorder)}
                  {...register("linkedinUrl")} />
                {errors.linkedinUrl && <p className={errText}>{errors.linkedinUrl.message}</p>}
                <LinkedInPreview url={watch("linkedinUrl") ?? ""} />
              </div>
              <div>
                <label htmlFor="source" className={labelClass}>
                  How did you hear about this role?
                </label>
                <select id="source"
                  className={cn(inputClass, errors.source ? errBorder : okBorder)}
                  {...register("source")}>
                  <option value="">Select an option…</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.source && <p className={errText}>{errors.source.message}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-display text-base font-bold text-ink dark:text-slate-100">
                Review your application
              </h4>
              <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
                <ReviewRow k="Full name" v={getValues("fullName")} />
                <ReviewRow k="Email" v={getValues("email")} />
                <ReviewRow k="Phone" v={getValues("phone")} />
                <ReviewRow k="Cover letter" v={getValues("coverLetter")} />
                <ReviewRow k="LinkedIn" v={getValues("linkedinUrl")} />
                <ReviewRow k="How they heard" v={getValues("source")} />
              </dl>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review everything above — this step is your confirmation. Submitting
                sends the application.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="mt-7 flex items-center justify-between border-t border-slate-200 pt-5 dark:border-white/10">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        )}
      </div>
    </section>
  );
}

function ReviewRow({ k, v }: { k: string; v: string | undefined }) {
  const provided = v && v.trim().length > 0;
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
      <dd
        className={cn(
          "max-w-[60%] break-words text-right font-medium",
          provided ? "text-slate-900 dark:text-slate-100" : "italic text-slate-400",
        )}
      >
        {provided ? v : "Not provided"}
      </dd>
    </div>
  );
}

// ---- Stretch C: best-effort LinkedIn preview --------------------------------
function LinkedInPreview({ url }: { url: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset the image error when the URL changes.
  useEffect(() => setImgFailed(false), [url]);

  if (!LINKEDIN_RE.test(url)) return null;

  // Derive a display name from the /in/<slug> path segment.
  const slug = url.split("/in/")[1]?.replace(/\/.*$/, "") ?? "";
  const name = slug
    ? slug
        .split("-")
        .filter((p) => !/^\d+$/.test(p)) // drop trailing id segments
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    : "LinkedIn profile";
  const initials = (name.match(/\b\w/g) ?? ["in"]).slice(0, 2).join("").toUpperCase();

  // LinkedIn exposes no public image URL; this src will almost always fail,
  // so onError swaps to an initials avatar (best-effort — see README).
  const guessSrc = slug ? `https://www.linkedin.com/in/${slug}/picture` : "";

  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      {!imgFailed && guessSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={guessSrc}
          alt=""
          onError={() => setImgFailed(true)}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-xs font-bold text-white">
          {initials}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {name}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          View profile
        </a>
      </div>
    </div>
  );
}
