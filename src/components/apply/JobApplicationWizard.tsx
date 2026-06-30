"use client";

// =============================================================
// src/components/apply/JobApplicationWizard.tsx
// The 5-step job-application wizard (Assignment 3.2, Feature 1 + 2).
//
//   1 Personal information   2 Contact details   3 Qualifications
//   4 Job-specific questions 5 Documents & consent
//
// • Each step is validated with Zod + React Hook Form before Next is allowed.
// • Position is kept in the URL via nuqs (?step=2) so a refresh resumes there.
// • "Save as Draft" persists on every step (localStorage fallback — the real
//   backend owns drafts; see apply-draft.ts / docs/BACKEND-GAPS.md).
// • Final submit → AlertDialog confirm → persist → success toast → redirect to
//   /applications/[id]/confirmation.
// =============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState, parseAsInteger } from "nuqs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Save, History, Send } from "lucide-react";
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
import WizardProgress from "@/components/apply/WizardProgress";
import DocumentUpload from "@/components/apply/DocumentUpload";
import {
  wizardSchema,
  WIZARD_EMPTY,
  STEP_LABELS,
  STEP_FIELDS,
  SA_PROVINCES,
  GENDERS,
  GENDER_LABELS,
  RACES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_STATUS_LABELS,
  QUALIFICATIONS,
  NOTICE_PERIODS,
  isTertiary,
  requiredDocuments,
  type WizardValues,
  type DocumentType,
} from "@/lib/apply-wizard";
import { getWizardDraft, saveWizardDraft, clearWizardDraft } from "@/lib/apply-draft";
import { getProfile, type UploadedDoc } from "@/lib/profile-store";
import { saveApplication, uid, type Application } from "@/lib/careerhub-store";
import { cn } from "@/lib/utils";

const LAST_STEP = STEP_LABELS.length - 1;

const inputClass =
  "mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 focus:ring-brand-500/30 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";
const ok = "border-slate-300 focus:border-brand-500 dark:border-white/10";
const bad = "border-red-500 focus:border-red-500 dark:border-red-500/70";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-200";
const errText = "mt-1.5 text-xs text-red-600 dark:text-red-400";

interface WizardJob {
  id: string;
  title: string;
  company: string;
  requiresDriversLicence: boolean;
}

interface Props {
  job: WizardJob;
  user: { name: string; email: string };
}

/** Best-effort split of a single stored name into first names + surname. */
function splitName(full: string): { fullNames: string; surname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { fullNames: full.trim(), surname: "" };
  return { fullNames: parts.slice(0, -1).join(" "), surname: parts.at(-1) ?? "" };
}

export default function JobApplicationWizard({ job, user }: Props) {
  const router = useRouter();
  // The URL (?step=) is the durable mirror: read once to initialise position
  // (so a refresh resumes there) and written on every change. Rendering is
  // driven by local state, NOT by reading the nuqs value back — that keeps step
  // changes synchronous and deterministic instead of depending on a URL
  // read-after-write round-trip.
  const [urlStep, setUrlStep] = useQueryState(
    "step",
    parseAsInteger.withDefault(0).withOptions({ history: "replace" }),
  );
  const clampStep = (n: number) => Math.min(Math.max(n, 0), LAST_STEP);
  const [current, setCurrent] = useState(() => clampStep(urlStep ?? 0));

  const [maxReached, setMaxReached] = useState(current);
  const [docs, setDocs] = useState<Partial<Record<DocumentType, UploadedDoc>>>({});
  const [docError, setDocError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const loadedRef = useRef(false);

  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: WIZARD_EMPTY,
    mode: "onTouched",
  });
  const { register, trigger, getValues, setValue, watch, reset, formState } = form;
  const errors = formState.errors;

  // ---- restore a draft, else pre-fill from the saved profile (once) ----------
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const draft = getWizardDraft(user.email, job.id);
    if (draft) {
      reset({ ...WIZARD_EMPTY, ...draft.values });
      const dstep = clampStep(draft.step);
      setCurrent(dstep);
      setMaxReached(dstep);
      void setUrlStep(dstep);
      setRestored(true);
      return;
    }

    const profile = getProfile(user.email);
    const { fullNames, surname } = splitName(profile?.personal.fullName || user.name);
    const provinceRaw = profile?.address.province ?? "";
    const province = (SA_PROVINCES as readonly string[]).includes(provinceRaw)
      ? (provinceRaw as WizardValues["province"])
      : WIZARD_EMPTY.province;
    const nat = profile?.personal.nationality;
    reset({
      ...WIZARD_EMPTY,
      fullNames,
      surname,
      email: profile?.personal.email || user.email,
      phone: profile?.personal.phone ?? "",
      dateOfBirth: profile?.personal.dateOfBirth ?? "",
      gender: (GENDERS as readonly string[]).includes(profile?.personal.gender ?? "")
        ? (profile!.personal.gender as WizardValues["gender"])
        : WIZARD_EMPTY.gender,
      nationality: nat && nat !== "South African" ? "Other" : "South African",
      nationalityOther: nat && nat !== "South African" ? nat : "",
      physicalAddress: [profile?.address.line1, profile?.address.line2]
        .filter(Boolean)
        .join(", "),
      city: profile?.address.city ?? "",
      province,
      postalCode: profile?.address.postalCode ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which documents this application needs, given the answers + job flag.
  const nationality = watch("nationality");
  const highestQualification = watch("highestQualification");
  const reqDocs = useMemo(
    () =>
      requiredDocuments({
        isSouthAfrican: nationality === "South African",
        hasTertiary: isTertiary(highestQualification),
        jobRequiresLicence: job.requiresDriversLicence,
      }),
    [nationality, highestQualification, job.requiresDriversLicence],
  );

  const allDocsUploaded = reqDocs.every((d) => docs[d.type]);
  const consentsTicked =
    watch("confirmedAccurate") &&
    watch("consentDataProcessing") &&
    watch("consentEmployerContact");

  function persistDraft(toStep: number) {
    saveWizardDraft({
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      email: user.email,
      values: getValues(),
      step: toStep,
    });
  }

  function goto(target: number) {
    const clamped = clampStep(target);
    setCurrent(clamped);
    setMaxReached((m) => Math.max(m, clamped));
    void setUrlStep(clamped); // mirror into the URL (best-effort)
  }

  async function next() {
    const valid = await trigger(STEP_FIELDS[current], { shouldFocus: true });
    if (!valid) return;
    persistDraft(current + 1);
    goto(current + 1);
  }

  function back() {
    goto(current - 1);
  }

  function saveDraftNow() {
    persistDraft(current);
    toast.info("Draft saved", {
      description: "Your progress is saved on this device. Pick up where you left off anytime.",
    });
  }

  async function onConfirmSubmit() {
    const valid = await trigger();
    if (!valid) {
      // Jump to the earliest step that has an error so the user can see it.
      const firstBad = STEP_FIELDS.findIndex((fields) =>
        fields.some((f) => errors[f]),
      );
      if (firstBad >= 0) goto(firstBad);
      toast.error("Please fix the highlighted fields before submitting.");
      return;
    }
    if (!allDocsUploaded) {
      setDocError("Please upload every required document before submitting.");
      goto(LAST_STEP);
      return;
    }

    setSubmitting(true);
    const v = getValues();
    const id = uid();
    const application: Application = {
      id,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      fullName: `${v.fullNames} ${v.surname}`.trim(),
      email: v.email.trim(),
      phone: v.phone.trim(),
      nationality: v.nationality === "Other" ? v.nationalityOther || "Other" : "South African",
      idNumber: "",
      hasRequiredSkill: true,
      cvFileName: docs.Cv?.fileName ?? "",
      acceptedTerms: true,
      status: "Submitted",
      appliedAt: new Date().toISOString(),
      wizard: v as unknown as Record<string, unknown>,
      documents: reqDocs.map((d) => ({
        type: d.type,
        fileName: docs[d.type]!.fileName,
        size: docs[d.type]!.size,
      })),
    };

    // ⚠️ localStorage fallback for POST /api/applications/{id}/submit. The real
    // backend runs full server-side validation and persists the PDFs.
    await new Promise((r) => setTimeout(r, 600));
    saveApplication(application);
    clearWizardDraft(user.email, job.id);
    toast.success("Application submitted", {
      description: `Your application for ${job.title} is on its way.`,
    });
    router.push(`/applications/${id}/confirmation`);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-[#1a1133]">
      <WizardProgress
        steps={STEP_LABELS}
        current={current}
        maxReached={maxReached}
        onStepSelect={goto}
      />

      {restored && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
          <History className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="text-amber-800 dark:text-amber-200">
            We restored your saved draft. Note: uploaded documents aren&apos;t saved
            in drafts — please re-attach them on the last step.
          </p>
        </div>
      )}

      <div className="mt-7 min-h-[340px]">
        {current === 0 && <StepPersonal />}
        {current === 1 && <StepContact />}
        {current === 2 && <StepQualifications />}
        {current === 3 && <StepJobSpecific />}
        {current === 4 && <StepDocuments />}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
        <button
          type="button"
          onClick={back}
          disabled={current === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={saveDraftNow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
          >
            <Save className="h-4 w-4" /> Save as Draft
          </button>

          {current < LAST_STEP ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={submitting || !allDocsUploaded || !consentsTicked}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {submitting ? "Submitting…" : "Submit application"}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit your application?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;re applying for <strong>{job.title}</strong> at{" "}
                    <strong>{job.company}</strong>. Once submitted you won&apos;t be able
                    to edit your answers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Review again</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void onConfirmSubmit();
                    }}
                  >
                    Submit application
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </section>
  );

  // ===== Step renderers (closures share register/errors/watch) ==============

  function StepPersonal() {
    const disability = watch("disabilityStatus");
    return (
      <div className="space-y-5">
        <StepHeading title="Personal information" subtitle="Tell us who you are." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text id="fullNames" label="Full name(s)" reg="fullNames" />
          <Text id="surname" label="Surname" reg="surname" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="gender" label="Gender" reg="gender">
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </Select>
          <div>
            <label htmlFor="race" className={labelClass}>
              Race <span className="text-slate-400">(optional)</span>
            </label>
            <select id="race" className={cn(inputClass, ok)} {...register("race")}>
              <option value="">Select…</option>
              {RACES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dateOfBirth" className={labelClass}>
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              type="date"
              className={cn(inputClass, errors.dateOfBirth ? bad : ok)}
              {...register("dateOfBirth")}
            />
            {errors.dateOfBirth && <p className={errText}>{errors.dateOfBirth.message}</p>}
          </div>
          <div>
            <label htmlFor="nationality" className={labelClass}>
              Nationality
            </label>
            <select
              id="nationality"
              className={cn(inputClass, ok)}
              {...register("nationality")}
            >
              <option value="South African">South African</option>
              <option value="Other">Other (non-South African)</option>
            </select>
          </div>
        </div>
        {nationality === "Other" && (
          <Text id="nationalityOther" label="Which country are you a citizen of?" reg="nationalityOther" />
        )}

        <fieldset>
          <legend className={labelClass}>Do you have a disability?</legend>
          <div className="mt-2 flex gap-2">
            <YesNo value={disability} onPick={(v) => setValue("disabilityStatus", v, { shouldValidate: true })} />
          </div>
        </fieldset>
        {disability && (
          <div>
            <label htmlFor="disabilityDetails" className={labelClass}>
              Please describe any support you may need
            </label>
            <textarea
              id="disabilityDetails"
              rows={3}
              className={cn(inputClass, errors.disabilityDetails ? bad : ok)}
              {...register("disabilityDetails")}
            />
            {errors.disabilityDetails && (
              <p className={errText}>{errors.disabilityDetails.message}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  function StepContact() {
    return (
      <div className="space-y-5">
        <StepHeading title="Contact details" subtitle="How can employers reach you?" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text id="email" label="Email" type="email" reg="email" />
          <Text id="phone" label="Phone" type="tel" reg="phone" />
        </div>
        <Text id="alternatePhone" label="Alternate phone" type="tel" reg="alternatePhone" optional />
        <Text id="physicalAddress" label="Physical address" reg="physicalAddress" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Text id="city" label="City" reg="city" />
          <Select id="province" label="Province" reg="province">
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Text id="postalCode" label="Postal code" reg="postalCode" />
        </div>
      </div>
    );
  }

  function StepQualifications() {
    return (
      <div className="space-y-5">
        <StepHeading
          title="Qualifications & experience"
          subtitle="Your education and work background."
        />
        <Select id="highestQualification" label="Highest qualification" reg="highestQualification">
          <option value="">Select…</option>
          {QUALIFICATIONS.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text id="institution" label="Institution" reg="institution" />
          <Text id="yearCompleted" label="Year completed" type="number" reg="yearCompleted" optional />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="employmentStatus" label="Current employment status" reg="employmentStatus">
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EMPLOYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Text id="yearsOfExperience" label="Years of experience" type="number" reg="yearsOfExperience" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text id="linkedInUrl" label="LinkedIn URL" type="url" reg="linkedInUrl" optional />
          <Text id="portfolioUrl" label="Portfolio / GitHub URL" type="url" reg="portfolioUrl" optional />
        </div>
      </div>
    );
  }

  function StepJobSpecific() {
    const relocate = watch("willingToRelocate");
    const motivation = watch("motivationText") ?? "";
    return (
      <div className="space-y-5">
        <StepHeading
          title="Job-specific questions"
          subtitle={`A few questions specific to ${job.title}.`}
        />
        <div>
          <label htmlFor="motivationText" className={labelClass}>
            Why are you a good fit for this role?
          </label>
          <textarea
            id="motivationText"
            rows={5}
            placeholder="Tell us what makes you the right candidate…"
            className={cn(inputClass, errors.motivationText ? bad : ok)}
            {...register("motivationText")}
          />
          <div className="mt-1 flex justify-between text-xs">
            {errors.motivationText ? (
              <span className="text-red-600 dark:text-red-400">
                {errors.motivationText.message}
              </span>
            ) : (
              <span className="text-slate-400">Minimum 100 characters.</span>
            )}
            <span className={cn(motivation.length < 100 ? "text-slate-400" : "text-brand-600 dark:text-brand-300")}>
              {motivation.length}/100
            </span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="expectedSalary" className={labelClass}>
              Expected salary (ZAR / month) <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="expectedSalary"
              inputMode="numeric"
              placeholder="e.g. 35000"
              className={cn(inputClass, errors.expectedSalary ? bad : ok)}
              {...register("expectedSalary")}
            />
            {errors.expectedSalary && <p className={errText}>{errors.expectedSalary.message}</p>}
          </div>
          <Select id="noticePeriod" label="Notice period" reg="noticePeriod">
            {NOTICE_PERIODS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="availableStartDate" className={labelClass}>
            Available start date
          </label>
          <input
            id="availableStartDate"
            type="date"
            className={cn(inputClass, errors.availableStartDate ? bad : ok)}
            {...register("availableStartDate")}
          />
          {errors.availableStartDate && (
            <p className={errText}>{errors.availableStartDate.message}</p>
          )}
        </div>
        <fieldset>
          <legend className={labelClass}>Are you willing to relocate?</legend>
          <div className="mt-2 flex gap-2">
            <YesNo value={relocate} onPick={(v) => setValue("willingToRelocate", v, { shouldValidate: true })} />
          </div>
        </fieldset>
      </div>
    );
  }

  function StepDocuments() {
    return (
      <div className="space-y-5">
        <StepHeading
          title="Documents & consent"
          subtitle="All documents must be PDF, max 3 MB each."
        />
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          No special characters or spaces in filenames — uploads are renamed
          automatically to <code>{"{userId}-{document}.pdf"}</code>.
        </p>

        <div className="space-y-3">
          {reqDocs.map((d) => (
            <DocumentUpload
              key={d.type}
              docType={d.type}
              label={d.label}
              note={d.note}
              userId={user.email}
              value={docs[d.type] ?? null}
              onChange={(doc) => {
                setDocError(null);
                setDocs((prev) => {
                  const next = { ...prev };
                  if (doc) next[d.type] = doc;
                  else delete next[d.type];
                  return next;
                });
              }}
            />
          ))}
        </div>

        {docError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {docError}
          </p>
        )}

        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <legend className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Consent
          </legend>
          <Consent reg="confirmedAccurate" error={errors.confirmedAccurate?.message}>
            I confirm all information provided is true and accurate.
          </Consent>
          <Consent reg="consentDataProcessing" error={errors.consentDataProcessing?.message}>
            I consent to CareerHubX processing my data per the{" "}
            <Link href="/privacy" className="font-semibold text-brand-600 underline dark:text-brand-300">
              Privacy Policy
            </Link>
            .
          </Consent>
          <Consent reg="consentEmployerContact" error={errors.consentEmployerContact?.message}>
            I agree to be contacted by employers regarding this application.
          </Consent>
        </fieldset>
      </div>
    );
  }

  // ===== small field helpers =================================================

  function Text({
    id,
    label,
    reg,
    type = "text",
    optional = false,
  }: {
    id: string;
    label: string;
    reg: keyof WizardValues;
    type?: string;
    optional?: boolean;
  }) {
    const err = errors[reg];
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {label} {optional && <span className="text-slate-400">(optional)</span>}
        </label>
        <input
          id={id}
          type={type}
          aria-invalid={err ? true : undefined}
          className={cn(inputClass, err ? bad : ok)}
          {...register(reg)}
        />
        {err && <p className={errText}>{err.message as string}</p>}
      </div>
    );
  }

  function Select({
    id,
    label,
    reg,
    children,
  }: {
    id: string;
    label: string;
    reg: keyof WizardValues;
    children: React.ReactNode;
  }) {
    const err = errors[reg];
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <select
          id={id}
          aria-invalid={err ? true : undefined}
          className={cn(inputClass, err ? bad : ok)}
          {...register(reg)}
        >
          {children}
        </select>
        {err && <p className={errText}>{err.message as string}</p>}
      </div>
    );
  }

  function Consent({
    reg,
    error,
    children,
  }: {
    reg: keyof WizardValues;
    error?: string;
    children: React.ReactNode;
  }) {
    return (
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40 dark:border-white/20 dark:bg-[#0f0a1e]"
            {...register(reg)}
          />
          <span className="text-slate-700 dark:text-slate-200">{children}</span>
        </label>
        {error && <p className="ml-7 mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
}

// ---- shared presentational bits (module scope) ------------------------------

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="font-display text-lg font-bold text-ink dark:text-slate-100">{title}</h3>
      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

function YesNo({ value, onPick }: { value: boolean; onPick: (v: boolean) => void }) {
  return (
    <>
      {([["Yes", true], ["No", false]] as const).map(([label, v]) => {
        const active = value === v;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(v)}
            className={cn(
              "rounded-lg border px-5 py-2 text-sm font-semibold transition",
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-[#0f0a1e] dark:text-slate-300 dark:hover:bg-white/10",
            )}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}
