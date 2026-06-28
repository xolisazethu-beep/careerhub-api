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

export default function JobFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      location: parseAsString.withDefault(""),
      status: parseAsStringLiteral(STATUS).withDefault("all"),
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

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[2fr_1.5fr_auto]">
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
    </div>
  );
}
