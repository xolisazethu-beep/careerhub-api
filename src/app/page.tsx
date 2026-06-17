"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { JobListing } from "@/types";
import JobList from "@/components/JobList";
import SummaryPanel from "@/components/SummaryPanel";
import FilterBar, { type SortOption } from "@/components/FilterBar";
import ApplyModal from "@/components/ApplyModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { EmploymentType } from "@/types";

/** ISO 8601 string for a date `n` days before now — keeps the demo data fresh. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/**
 * Hardcoded data that mirrors exactly what GET /api/v1/jobs will return.
 * Realistic South African roles, cities and rand salary ranges. Includes:
 *   - a closed listing (isActive: false)
 *   - a listing with zero applicants
 *   - several employment types
 *   - one posted today and one posted more than 30 days ago
 */
const JOBS: JobListing[] = [
  {
    id: "a1b2c3d4-0001-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Senior Frontend Engineer",
    company: "Yoco",
    location: "Cape Town",
    employmentType: "FullTime",
    salaryMin: 75000,
    salaryMax: 95000,
    postedAt: daysAgo(0),
    isActive: true,
    applicantCount: 12,
  },
  {
    id: "a1b2c3d4-0002-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Backend Developer (.NET)",
    company: "Investec",
    location: "Sandton",
    employmentType: "FullTime",
    salaryMin: 68000,
    salaryMax: 88000,
    postedAt: daysAgo(2),
    isActive: true,
    applicantCount: 0,
  },
  {
    id: "a1b2c3d4-0003-4a1b-9c2d-0e1f2a3b4c5d",
    title: "UX Designer",
    company: "Takealot",
    location: "Remote",
    employmentType: "Contract",
    salaryMin: 45000,
    salaryMax: 60000,
    postedAt: daysAgo(5),
    isActive: true,
    applicantCount: 7,
  },
  {
    id: "a1b2c3d4-0004-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Software Engineering Intern",
    company: "Standard Bank",
    location: "Johannesburg",
    employmentType: "Internship",
    salaryMin: 18000,
    salaryMax: 22000,
    postedAt: daysAgo(9),
    isActive: true,
    applicantCount: 34,
  },
  {
    id: "a1b2c3d4-0005-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Part-time Data Analyst",
    company: "Discovery",
    location: "Sandton",
    employmentType: "PartTime",
    salaryMin: 30000,
    salaryMax: 40000,
    postedAt: daysAgo(18),
    isActive: true,
    applicantCount: 4,
  },
  {
    id: "a1b2c3d4-0006-4a1b-9c2d-0e1f2a3b4c5d",
    title: "DevOps Engineer",
    company: "Luno",
    location: "Cape Town",
    employmentType: "FullTime",
    salaryMin: 80000,
    salaryMax: 110000,
    postedAt: daysAgo(42),
    isActive: false,
    applicantCount: 58,
  },
  {
    id: "a1b2c3d4-0007-4a1b-9c2d-0e1f2a3b4c5d",
    title: "Mobile Developer (Flutter)",
    company: "SnapScan",
    location: "Remote",
    employmentType: "Contract",
    salaryMin: 55000,
    salaryMax: 72000,
    postedAt: daysAgo(11),
    isActive: true,
    applicantCount: 9,
  },
];

export default function Home() {
  const { user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);

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

  const selectedJob = useMemo(
    () => JOBS.find((job) => job.id === selectedId) ?? null,
    [selectedId],
  );

  const applyingJob = useMemo(
    () => JOBS.find((job) => job.id === applyingId) ?? null,
    [applyingId],
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
    setApplyingId(id);
  };

  const confirmApply = (id: string) => {
    setApplyingId(null);
    const job = JOBS.find((j) => j.id === id);
    notify(`Application sent to ${job?.company ?? "the employer"}.`, "success");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Find your next role in South Africa
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Browse {JOBS.length} curated openings from leading local employers.
          {user ? " Save the ones you like and apply in a click." : " Sign in to save roles and apply."}
        </p>
      </section>

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

      <ApplyModal
        job={applyingJob}
        onClose={() => setApplyingId(null)}
        onConfirm={confirmApply}
      />
    </div>
  );
}
