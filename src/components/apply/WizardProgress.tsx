"use client";

// =============================================================
// src/components/apply/WizardProgress.tsx
// Reusable, accessible step indicator for the application wizard.
//
//   • md+ : numbered circles joined by a connecting line; the current step is
//           highlighted in the brand colour, completed steps show a check.
//   • <md : collapses to a compact "Step N of M — <label>" header with a bar.
//
// Accessibility: rendered as an <ol> with aria-current="step" on the active
// circle. Visited steps are real <button>s so the whole control is keyboard
// navigable (Tab + Enter); future/locked steps are non-interactive <span>s.
// =============================================================

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  steps: readonly string[];
  /** 0-based index of the current step. */
  current: number;
  /** Highest step the user has reached — anything ≤ this is navigable. */
  maxReached: number;
  /** Jump to a previously-visited step. */
  onStepSelect: (index: number) => void;
}

export default function WizardProgress({
  steps,
  current,
  maxReached,
  onStepSelect,
}: WizardProgressProps) {
  return (
    <div>
      {/* Mobile: compact "Step N of M" header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-brand-600 dark:text-brand-300">
            Step {current + 1} of {steps.length}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {steps[current]}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={current + 1}
          aria-label={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* md+: full numbered stepper */}
      <ol className="hidden items-center md:flex">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const visited = i <= maxReached;
          const isLast = i === steps.length - 1;

          const circle = (
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition",
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/30"
                  : done
                    ? "border-brand-600 bg-brand-600/10 text-brand-700 dark:text-brand-300"
                    : "border-slate-300 bg-white text-slate-400 dark:border-white/15 dark:bg-[#0f0a1e] dark:text-slate-500",
              )}
            >
              {done ? <Check className="h-5 w-5" /> : i + 1}
            </span>
          );

          return (
            <li
              key={label}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              <div className="flex flex-col items-center">
                {visited && !active ? (
                  <button
                    type="button"
                    onClick={() => onStepSelect(i)}
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133]"
                    aria-label={`Go to step ${i + 1}: ${label}`}
                  >
                    {circle}
                  </button>
                ) : (
                  circle
                )}
                <span
                  className={cn(
                    "mt-2 w-24 text-center text-[11px] font-medium leading-tight",
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
                  aria-hidden="true"
                  className={cn(
                    "mx-1 -mt-6 h-0.5 flex-1 rounded",
                    i < current ? "bg-brand-600" : "bg-slate-200 dark:bg-white/15",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
