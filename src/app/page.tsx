"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import JobList from "@/components/JobList";
import SummaryPanel from "@/components/SummaryPanel";
import FilterBar, { type SortOption } from "@/components/FilterBar";
import { JOBS } from "@/lib/seed-jobs";
import {
  getLatestApplication,
  type Application,
} from "@/lib/careerhub-store";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { EmploymentType } from "@/types";

/** sessionStorage key under which the currently selected job id is persisted. */
const SELECTED_JOB_KEY = "careerhub:selectedJobId";

export default function Home() {
  const { user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [lastApplication, setLastApplication] = useState<Application | null>(
    null,
  );

  // When a user is signed in, surface their most recent application so it is
  // waiting for them every time they log in. Re-runs whenever the user changes.
  useEffect(() => {
    setLastApplication(user ? getLatestApplication(user.email) : null);
  }, [user]);

  // Filter / sort UI state.
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmploymentType | "All">("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [activeOnly, setActiveOnly] = useState(false);

  const visibleJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = JOBS.filter((job) => {
      if (typeFilter !== "All" && job.employmentType !== typeFilter) return false;
      if (activeOnly && !job.isActive) return false;
      if (
        term &&
        !job.title.toLowerCase().includes(term) &&
        !job.company.toLowerCase().includes(term) &&
        !job.location.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sort === "newest") {
      sorted.sort((a, b) => +new Date(b.postedAt) - +new Date(a.postedAt));
    } else if (sort === "salaryHigh") {
      sorted.sort((a, b) => b.salaryMax - a.salaryMax);
    } else {
      sorted.sort((a, b) => a.salaryMin - b.salaryMin);
    }
    return sorted;
  }, [query, typeFilter, sort, activeOnly]);

  // EFFECT 1 — restore on mount only.
  // Empty dependency array `[]`: reading sessionStorage is a one-time startup
  // side effect that must run exactly once, after the first render, never again.
  // We restore the stored id ONLY if it still matches a job in the current
  // dataset; a stale id (e.g. a listing that has since been removed) is ignored
  // silently so the user never lands on a selection that no longer exists.
  useEffect(() => {
    const stored = sessionStorage.getItem(SELECTED_JOB_KEY);
    if (stored && JOBS.some((job) => job.id === stored)) {
      setSelectedId(stored);
    }
  }, []);

  // EFFECT 2 — persist whenever the selection changes.
  // Dependency array `[selectedId]`: this effect must re-run every time the
  // selection changes so storage always mirrors current state. When a job is
  // selected we write its id; when nothing is selected we REMOVE the key
  // entirely rather than writing an empty/"null" string, so no stale value is
  // ever left behind for Effect 1 to restore on the next load.
  useEffect(() => {
    if (selectedId) {
      sessionStorage.setItem(SELECTED_JOB_KEY, selectedId);
    } else {
      sessionStorage.removeItem(SELECTED_JOB_KEY);
    }
  }, [selectedId]);

  const selectedJob = useMemo(
    () => JOBS.find((job) => job.id === selectedId) ?? null,
    [selectedId],
  );

  // Clicking the already-selected card deselects it.
  const handleSelect = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  };

  const handleToggleSave = (id: string) => {
    if (!user) {
      notify("Sign in to save jobs.", "info");
      router.push("/login");
      return;
    }
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        notify("Removed from saved jobs.", "info");
      } else {
        next.add(id);
        notify("Saved to your list.", "success");
      }
      return next;
    });
  };

  const handleApply = (id: string) => {
    if (!user) {
      notify("Sign in to apply for roles.", "info");
      router.push("/login");
      return;
    }
    router.push(`/apply/${id}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100 sm:text-4xl">
          Find your next role in South Africa
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Browse {JOBS.length} curated openings from leading local employers.
          {user ? " Save the ones you like and apply in a click." : " Sign in to save roles and apply."}
        </p>
      </section>

      {/* Returning-user greeting: their last application, always waiting. */}
      {user && lastApplication && (
        <Link
          href="/applications"
          className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-500/30 bg-brand-500/10 px-5 py-4 text-sm transition hover:bg-brand-500/15"
        >
          <span className="text-slate-700 dark:text-slate-200">
            Welcome back — your last application:{" "}
            <span className="font-semibold text-ink dark:text-white">
              {lastApplication.jobTitle}
            </span>{" "}
            at{" "}
            <span className="font-semibold text-ink dark:text-white">
              {lastApplication.company}
            </span>
          </span>
          <span className="rounded-full border border-brand-500/40 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
            {lastApplication.status} · Track →
          </span>
        </Link>
      )}

      <div className="mb-6">
        <FilterBar
          query={query}
          onQueryChange={setQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          sort={sort}
          onSortChange={setSort}
          activeOnly={activeOnly}
          onActiveOnlyChange={setActiveOnly}
        />
      </div>

      {/* Summary panel renders ONLY when a job is selected — otherwise it is
          absent from the DOM entirely (not hidden, not an empty node). */}
      {selectedJob ? (
        <div className="mb-6">
          <SummaryPanel
            job={selectedJob}
            onClear={() => setSelectedId(null)}
            onApply={handleApply}
          />
        </div>
      ) : null}

      <JobList
        jobs={visibleJobs}
        selectedId={selectedId}
        onSelect={handleSelect}
        savedIds={savedIds}
        onToggleSave={handleToggleSave}
        onApply={handleApply}
      />
    </div>
  );
}