"use client";

import { useEffect, useRef, useState } from "react";
import {
  useQueryStates,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

/**
 * JobFilters — URL-backed filters for /jobs (Assignment 2.3, Part 6).
 *
 * All three filters live in ONE `useQueryStates` call so they share a single
 * history entry and a single render. `shallow: false` is the key: it tells nuqs
 * to do a real (server) navigation on change, so the Server Component re-runs
 * `getJobs(searchParams)` and re-filters — the filtering happens on the server,
 * the URL is just the input.
 *
 * Why nuqs and not useState: the filter state IS the URL, so it survives a
 * refresh, is shareable/bookmarkable, and works with browser back/forward — none
 * of which useState (component-local, lost on reload) can give you.
 *
 * Debounce: the text inputs hold a LOCAL useState value and only push to the URL
 * 300ms after typing stops, so we navigate once per pause instead of once per
 * keystroke. The status toggle is a single discrete choice, so it updates the
 * URL immediately (no debounce).
 */
const STATUS = ["open", "all"] as const;

/** Sort orders, kept in sync with SORT_ORDERS + sortJobs() on the server. */
const SORT_OPTIONS = [
  "newest",
  "oldest",
  "salary_high",
  "salary_low",
  "title",
  "company",
] as const;

const SORT_LABELS: Record<(typeof SORT_OPTIONS)[number], string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  salary_high: "Salary: high to low",
  salary_low: "Salary: low to high",
  title: "Title: A–Z",
  company: "Company: A–Z",
};

export default function JobFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      location: parseAsString.withDefault(""),
      status: parseAsStringLiteral(STATUS).withDefault("all"),
      sort: parseAsStringLiteral(SORT_OPTIONS).withDefault("newest"),
    },
    { shallow: false },
  );

  // Local mirrors of the debounced text fields.
  const [qInput, setQInput] = useState(filters.q);
  const [locInput, setLocInput] = useState(filters.location);

  // Keep local inputs in sync when the URL changes from OUTSIDE this component
  // (back/forward, a "clear filters" link), without fighting the user's typing.
  useEffect(() => setQInput(filters.q), [filters.q]);
  useEffect(() => setLocInput(filters.location), [filters.location]);

  const qTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (qTimer.current) clearTimeout(qTimer.current);
      if (locTimer.current) clearTimeout(locTimer.current);
    },
    [],
  );

  function onKeyword(value: string) {
    setQInput(value);
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => {
      // null removes the param entirely when empty (back to the "" default).
      setFilters({ q: value || null });
    }, 300);
  }

  function onLocation(value: string) {
    setLocInput(value);
    if (locTimer.current) clearTimeout(locTimer.current);
    locTimer.current = setTimeout(() => {
      setFilters({ location: value || null });
    }, 300);
  }

  function onStatus(value: (typeof STATUS)[number]) {
    setFilters({ status: value });
  }

  function onSort(value: (typeof SORT_OPTIONS)[number]) {
    setFilters({ sort: value });
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[2fr_1.5fr_auto] lg:grid-cols-[2fr_1.5fr_auto_auto]">
      <div>
        <label htmlFor="filter-q" className="sr-only">
          Search by keyword
        </label>
        <input
          id="filter-q"
          type="text"
          value={qInput}
          onChange={(e) => onKeyword(e.target.value)}
          placeholder="Search title or company…"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="filter-location" className="sr-only">
          Location
        </label>
        {/* A free-text input (not a select): locations are open-ended strings
            from the job data, so a fixed dropdown would go stale as new cities
            appear. Substring matching keeps it forgiving. */}
        <input
          id="filter-location"
          type="text"
          value={locInput}
          onChange={(e) => onLocation(e.target.value)}
          placeholder="Location…"
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
        {STATUS.map((value) => {
          const active = filters.status === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onStatus(value)}
              aria-pressed={active}
              className={
                active
                  ? "rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
              }
            >
              {value === "open" ? "Open" : "All"}
            </button>
          );
        })}
      </div>

      {/* Sort order. A native <select> is the right control for a single choice
          from a fixed list — accessible and keyboard-friendly out of the box.
          Like the other filters it writes to the URL (shallow:false), so the
          server re-runs getJobs() and returns the list already sorted. */}
      <div>
        <label htmlFor="filter-sort" className="sr-only">
          Sort jobs
        </label>
        <select
          id="filter-sort"
          value={filters.sort}
          onChange={(e) =>
            onSort(e.target.value as (typeof SORT_OPTIONS)[number])
          }
          className={inputClass}
        >
          {SORT_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
