"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState, type FormEvent } from "react";

/**
 * JobSearchBar — drives the /jobs board's search & sort via the URL.
 *
 * It's a Client Component (it has inputs and navigates), but it stays a thin
 * island: on submit it just pushes a new querystring onto /jobs. The board page
 * is a Server Component that reads those params and re-fetches from the API —
 * so the actual filtering/sorting happens on the server/database, and every
 * search is a shareable, bookmarkable URL.
 *
 * The backend already supports all of this on GET /api/jobs:
 *   q=…            full-text-ish search by title
 *   location=…     filter by place
 *   sort + dir     newest/oldest (postedat) and salary high/low (salarymax/min)
 */
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "salary_high", label: "Salary: high to low" },
  { value: "salary_low", label: "Salary: low to high" },
] as const;

export default function JobSearchBar() {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [location, setLocation] = useState(params.get("location") ?? "");
  const [sort, setSort] = useState(params.get("sort") ?? "newest");

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (location.trim()) next.set("location", location.trim());
    if (sort && sort !== "newest") next.set("sort", sort);
    const qs = next.toString();
    router.push(qs ? `/jobs?${qs}` : "/jobs");
  }

  function clear() {
    setQ("");
    setLocation("");
    setSort("newest");
    router.push("/jobs");
  }

  const hasFilters = q.trim() || location.trim() || sort !== "newest";

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr_auto_auto]"
    >
      <label className="relative">
        <span className="sr-only">Search by job title</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by job title…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <label className="relative">
        <span className="sr-only">Location</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (e.g. Cape Town)"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <label>
        <span className="sr-only">Sort</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-full w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          Search
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear filters"
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}
