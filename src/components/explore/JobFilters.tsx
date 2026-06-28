"use client";

import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
} from "nuqs";
import type { EmploymentType } from "@/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employmentType";

/**
 * Week 2 Day 4, Concept 1 — filters live in the URL via nuqs.
 *
 * The parser map is the single source of truth for the three filter params, so
 * the writer (this `JobFilters` bar) and the reader (the infinite list) stay in
 * lock-step: same keys, same types, same defaults. nuqs serialises these into the
 * query string, which makes the filtered board shareable/bookmarkable and lets
 * the Back button step through filter states.
 *
 *   • category  → parseAsString  (maps onto the job's employment type)
 *   • minSalary → parseAsInteger (ZAR floor)
 *   • remote    → parseAsBoolean (remote-only)
 */
export const jobFilterParsers = {
  category: parseAsString.withDefault(""),
  minSalary: parseAsInteger.withDefault(0),
  remote: parseAsBoolean.withDefault(false),
};

/** Shared hook: read + write the URL filter state. Returns `[values, setValues]`. */
export function useJobFilters() {
  return useQueryStates(jobFilterParsers);
}

/** "All" plus every employment type, for the category chips. */
const CATEGORY_OPTIONS: Array<EmploymentType | "All"> = [
  "All",
  "FullTime",
  "PartTime",
  "Contract",
  "Internship",
  "Learnership",
];

const SALARY_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "Any salary", value: 0 },
  { label: "R20k+", value: 20000 },
  { label: "R40k+", value: 40000 },
  { label: "R60k+", value: 60000 },
  { label: "R80k+", value: 80000 },
];

/**
 * The filter bar. It only ever WRITES to the URL (via `setFilters`); it never
 * fetches. The server page reads the same params from `searchParams`, and the
 * infinite list reads them through `useJobFilters`, so changing a control here
 * re-keys the query and reloads page 1.
 */
export default function JobFilters() {
  const [filters, setFilters] = useJobFilters();

  const hasActiveFilters =
    filters.category !== "" || filters.minSalary > 0 || filters.remote;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {/* Category (employment type) */}
        <div className="min-w-0">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Category
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((option) => {
              const optionValue = option === "All" ? "" : option;
              const isActive = filters.category === optionValue;
              const label =
                option === "All" ? "All" : EMPLOYMENT_TYPE_LABELS[option];
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilters({ category: optionValue })}
                  aria-pressed={isActive}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                    isActive
                      ? "bg-brand-700 text-white dark:bg-brand-600"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {/* Minimum salary */}
          <label className="text-sm text-slate-600 dark:text-slate-300">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Min salary
            </span>
            <select
              value={filters.minSalary}
              onChange={(event) =>
                setFilters({ minSalary: Number(event.target.value) })
              }
              aria-label="Minimum salary"
              className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {SALARY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {/* Remote only */}
          <label className="flex cursor-pointer select-none items-center gap-2 pb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={filters.remote}
              onChange={(event) => setFilters({ remote: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
            />
            Remote only
          </label>

          {/* Clear — null resets a param back to its default and drops it from the URL. */}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() =>
                setFilters({ category: null, minSalary: null, remote: null })
              }
              className="pb-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
