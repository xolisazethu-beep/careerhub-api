"use client";

import type { EmploymentType } from "@/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employmentType";

export type SortOption = "newest" | "salaryHigh" | "salaryLow";

export interface FilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: EmploymentType | "All";
  onTypeFilterChange: (value: EmploymentType | "All") => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  activeOnly: boolean;
  onActiveOnlyChange: (value: boolean) => void;
}

const TYPE_OPTIONS: Array<EmploymentType | "All"> = [
  "All",
  "FullTime",
  "PartTime",
  "Contract",
  "Internship",
  "Learnership",
];

export default function FilterBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  sort,
  onSortChange,
  activeOnly,
  onActiveOnlyChange,
}: FilterBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by title, company or city"
            aria-label="Search jobs"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:bg-slate-800"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="hidden sm:inline">Sort</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            aria-label="Sort jobs"
            className="rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="newest">Newest first</option>
            <option value="salaryHigh">Salary: high to low</option>
            <option value="salaryLow">Salary: low to high</option>
          </select>
        </label>

        <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(event) => onActiveOnlyChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
          />
          Open roles only
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((option) => {
          const isActive = typeFilter === option;
          const label = option === "All" ? "All types" : EMPLOYMENT_TYPE_LABELS[option];
          return (
            <button
              key={option}
              type="button"
              onClick={() => onTypeFilterChange(option)}
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
  );
}
