"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { submitApplication } from "@/lib/api";
import type { ApplicationRequest } from "@/types";
import { cn } from "@/lib/utils";

// =============================================================
// Zod schema — the SINGLE source of validation truth.
//
// It is defined OUTSIDE the component so it is constructed once, not on every
// render, and so the inferred type below is a module-level type. Every rule the
// UI enforces lives here; the form passes plain `{...register("field")}` with
// no per-field validation options (Part 5 requirement). `zodResolver` is what
// runs this schema against the form values on submit.
// =============================================================

// A pragmatic phone matcher: optional leading "+", then 8–15 chars made of
// digits, spaces, dashes or parentheses. Deliberately lenient about format.
const phoneRegex = /^\+?[\d\s\-()]{8,15}$/;

const applicationSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Please enter your full name (at least 2 characters).")
      .max(100, "Name must be 100 characters or fewer."),

    email: z.email("Enter a valid email address."),

    // Optional. A valid phone OR the empty string (the field left blank). The
    // `.or(z.literal(""))` is what stops a blank field from being a validation
    // error; `.optional()` lets the key be absent entirely. See README.
    phone: z
      .string()
      .regex(phoneRegex, "Enter a valid phone number.")
      .or(z.literal(""))
      .optional(),

    // The HTML number input hands us a STRING. `z.coerce.number()` (Solution B
    // from Part 1 Q2) converts it at the schema boundary, so the inferred type
    // is still `number` and no per-field `valueAsNumber` is needed.
    yearsOfExperience: z.coerce
      .number()
      .int("Years of experience must be a whole number.")
      .min(0, "Years of experience cannot be negative.")
      .max(50, "Please enter 50 years or fewer."),

    coverLetter: z
      .string()
      .min(
        50,
        "Cover letter must be at least 50 characters — tell us why you're a strong fit.",
      )
      .max(2000, "Cover letter must be 2000 characters or fewer."),

    // Optional LinkedIn URL: a valid URL that mentions linkedin.com, OR blank.
    linkedInUrl: z
      .url("Enter a valid URL.")
      .refine((v) => v.includes("linkedin.com"), "Must be a LinkedIn URL.")
      .or(z.literal(""))
      .optional(),

    availableImmediately: z.boolean(),

    noticePeriodWeeks: z.coerce
      .number()
      .int("Notice period must be a whole number of weeks.")
      .min(0, "Notice period cannot be negative."),
  })
  // Cross-field rule: a candidate who is NOT available immediately must give a
  // notice period of at least one week. When they ARE available immediately the
  // notice period is irrelevant and ignored. The error is attached to the
  // notice-period field via `path` so it renders next to the offending input.
  .refine(
    (data) => data.availableImmediately || data.noticePeriodWeeks > 0,
    {
      message:
        "If you're not available immediately, your notice period must be at least 1 week.",
      path: ["noticePeriodWeeks"],
    },
  );

// The form's data type is DERIVED from the schema — never written by hand, so
// it can never drift from the validation rules above. `z.infer` gives the
// OUTPUT type (post-coercion: yearsOfExperience/noticePeriodWeeks are `number`).
type ApplicationFormData = z.infer<typeof applicationSchema>;

// Because `z.coerce.number()` accepts `unknown` and outputs `number`, the
// schema's INPUT type differs from its OUTPUT type. RHF models this with its
// three generics: <TFieldValues = input, TContext, TTransformedValues = output>.
// The form fields hold the raw input; `handleSubmit` hands `onValid` the
// coerced, validated output (ApplicationFormData).
type ApplicationFormInput = z.input<typeof applicationSchema>;

interface ApplicationFormProps {
  jobId: string;
  jobTitle: string;
}

// Shared input styling; the error border is layered on top with `cn`.
const baseInput =
  "mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 focus:ring-brand-500/30 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";
const okBorder = "border-slate-300 focus:border-brand-500 dark:border-white/10";
const errBorder =
  "border-red-500 focus:border-red-500 dark:border-red-500/70";

const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-200";
const errorTextClass = "mt-1.5 text-xs text-red-600 dark:text-red-400";

export default function ApplicationForm({ jobId, jobTitle }: ApplicationFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormInput, unknown, ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      availableImmediately: true,
      noticePeriodWeeks: 0,
      yearsOfExperience: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: submitApplication,
    // Option A — onSuccess lives in the useMutation options, not at the call
    // site. Invalidating ["jobs"] (so applicant counts refetch) and clearing
    // the form are intrinsic to EVERY successful submit, independent of where
    // `mutateAsync` is called from. See README for the full justification.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      reset();
    },
  });

  // `handleSubmit` only calls this after Zod accepts every field. If Zod
  // rejects, this never runs and no network request fires.
  const onValid = async (data: ApplicationFormData) => {
    // Normalise the two optional fields: an empty string means "not provided",
    // so it is dropped from the request body entirely (ApplicationRequest treats
    // them as optional). `jobId` comes from the selected listing, not the form.
    const request: ApplicationRequest = {
      jobId,
      fullName: data.fullName,
      email: data.email,
      yearsOfExperience: data.yearsOfExperience,
      coverLetter: data.coverLetter,
      availableImmediately: data.availableImmediately,
      noticePeriodWeeks: data.noticePeriodWeeks,
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.linkedInUrl ? { linkedInUrl: data.linkedInUrl } : {}),
    };

    // mutateAsync (NOT mutate) returns a promise that `handleSubmit` awaits, so
    // RHF's `isSubmitting` stays true until the 800ms request settles. We catch
    // the rejection here only so the awaited promise resolves cleanly — the
    // actual error is surfaced through `mutation.isError` / `mutation.error`.
    try {
      await mutation.mutateAsync(request);
    } catch {
      /* handled via mutation.error */
    }
  };

  // Two flags, one guard. `isSubmitting` covers RHF's own async lifecycle;
  // `mutation.isPending` covers the in-flight request. Combining them keeps the
  // button disabled across the whole submit, never re-enabling mid-flight.
  const isBusy = isSubmitting || mutation.isPending;

  // SUCCESS — show the confirmation INSTEAD of the form, never both.
  if (mutation.isSuccess) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800/60 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="font-display text-lg font-bold text-emerald-900 dark:text-emerald-200">
              Application submitted
            </h3>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
              Your application for{" "}
              <span className="font-semibold">{jobTitle}</span> has been
              received. The hiring team will review it and update your status.
            </p>
            <button
              type="button"
              onClick={() => mutation.reset()}
              className="mt-4 rounded-lg border border-emerald-500/50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              Apply for another role
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    /* noValidate disables the browser's native HTML validation (the bubbles
       triggered by `required`, `type="email"`, etc.) so that OUR Zod schema is
       the single, consistent source of validation — same rules, same messages,
       same styling — instead of two competing validators. */
    <form
      onSubmit={handleSubmit(onValid)}
      noValidate
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]"
    >
      <div>
        <h3 className="font-display text-lg font-bold text-ink dark:text-slate-100">
          Apply for this role
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {jobTitle}
        </p>
      </div>

      {/* Form-level (server) error panel — ONLY for mutation failures. Zod
          errors render at the field level, never here. */}
      {mutation.isError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm dark:border-red-900/60 dark:bg-red-950/40"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">
            {mutation.error.message}
          </p>
        </div>
      )}

      {/* Full name */}
      <div>
        <label htmlFor="fullName" className={labelClass}>
          Full name
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors.fullName}
          className={cn(baseInput, errors.fullName ? errBorder : okBorder)}
          {...register("fullName")}
        />
        {errors.fullName && (
          <p className={errorTextClass}>{errors.fullName.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          className={cn(baseInput, errors.email ? errBorder : okBorder)}
          {...register("email")}
        />
        {errors.email && (
          <p className={errorTextClass}>{errors.email.message}</p>
        )}
      </div>

      {/* Phone (optional) */}
      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          className={cn(baseInput, errors.phone ? errBorder : okBorder)}
          {...register("phone")}
        />
        {errors.phone && (
          <p className={errorTextClass}>{errors.phone.message}</p>
        )}
      </div>

      {/* Years of experience */}
      <div>
        <label htmlFor="yearsOfExperience" className={labelClass}>
          Years of experience
        </label>
        <input
          id="yearsOfExperience"
          type="number"
          min={0}
          max={50}
          aria-invalid={!!errors.yearsOfExperience}
          className={cn(
            baseInput,
            errors.yearsOfExperience ? errBorder : okBorder,
          )}
          {...register("yearsOfExperience")}
        />
        {errors.yearsOfExperience && (
          <p className={errorTextClass}>{errors.yearsOfExperience.message}</p>
        )}
      </div>

      {/* Cover letter */}
      <div>
        <label htmlFor="coverLetter" className={labelClass}>
          Cover letter
        </label>
        <textarea
          id="coverLetter"
          rows={5}
          placeholder="Tell us why you're a strong fit for this role…"
          aria-invalid={!!errors.coverLetter}
          className={cn(baseInput, errors.coverLetter ? errBorder : okBorder)}
          {...register("coverLetter")}
        />
        {errors.coverLetter && (
          <p className={errorTextClass}>{errors.coverLetter.message}</p>
        )}
      </div>

      {/* LinkedIn (optional) */}
      <div>
        <label htmlFor="linkedInUrl" className={labelClass}>
          LinkedIn profile <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="linkedInUrl"
          type="url"
          placeholder="https://www.linkedin.com/in/you"
          aria-invalid={!!errors.linkedInUrl}
          className={cn(baseInput, errors.linkedInUrl ? errBorder : okBorder)}
          {...register("linkedInUrl")}
        />
        {errors.linkedInUrl && (
          <p className={errorTextClass}>{errors.linkedInUrl.message}</p>
        )}
      </div>

      {/* Available immediately — checkbox. RHF registers checkboxes natively. */}
      <div>
        <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
          <input
            id="availableImmediately"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40 dark:border-white/20 dark:bg-[#0f0a1e]"
            {...register("availableImmediately")}
          />
          I am available to start immediately
        </label>
      </div>

      {/* Notice period */}
      <div>
        <label htmlFor="noticePeriodWeeks" className={labelClass}>
          Notice period (weeks)
        </label>
        <input
          id="noticePeriodWeeks"
          type="number"
          min={0}
          aria-invalid={!!errors.noticePeriodWeeks}
          className={cn(
            baseInput,
            errors.noticePeriodWeeks ? errBorder : okBorder,
          )}
          {...register("noticePeriodWeeks")}
        />
        {errors.noticePeriodWeeks && (
          <p className={errorTextClass}>{errors.noticePeriodWeeks.message}</p>
        )}
      </div>

      {/* Submit — disabled while busy, with a visually distinct disabled state
          (muted background + not-allowed cursor) composed via cn, not opacity. */}
      <button
        type="submit"
        disabled={isBusy}
        className={cn(
          "w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133]",
          isBusy
            ? "cursor-not-allowed bg-slate-400 dark:bg-slate-600"
            : "bg-brand-600 hover:bg-brand-700",
        )}
      >
        {isBusy ? "Submitting…" : "Submit Application"}
      </button>
    </form>
  );
}
