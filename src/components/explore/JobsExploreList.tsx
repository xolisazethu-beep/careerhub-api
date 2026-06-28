"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getJobsPaginated } from "@/lib/api";
import JobCard from "@/components/JobCard";
import JobCardSkeleton from "@/components/JobCardSkeleton";
import { useJobFilters } from "@/components/explore/JobFilters";
import { useJobStore } from "@/stores/jobStore";

/** Page size — matches the API default for GET /api/jobs/explore. */
const LIMIT = 10;

/**
 * Week 2 Day 4, Concept 3 — infinite pagination with `useInfiniteQuery`.
 *
 * The query is keyed `["jobs", filters]` so changing any filter reloads page 1.
 * Pages are fetched through `getJobsPaginated`; `getNextPageParam` reads the
 * server's `hasMore` flag to decide the next page number (or stop). An invisible
 * sentinel at the bottom, watched by an IntersectionObserver, triggers
 * `fetchNextPage` as the user scrolls near it.
 */
export default function JobsExploreList() {
  const [filters] = useJobFilters();

  // Individual store selectors (never destructure the whole store).
  const selectedJobId = useJobStore((s) => s.selectedJobId);
  const setSelectedJobId = useJobStore((s) => s.setSelectedJobId);
  const openDetailPanel = useJobStore((s) => s.openDetailPanel);

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["jobs", filters],
    queryFn: ({ pageParam }) =>
      getJobsPaginated({
        page: pageParam,
        limit: LIMIT,
        category: filters.category,
        minSalary: filters.minSalary,
        remote: filters.remote,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSelect = (id: string) => {
    setSelectedJobId(id);
    openDetailPanel();
  };

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
        <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
          Couldn&apos;t load jobs
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
          {error instanceof Error ? error.message : "Please try again in a moment."}
        </p>
      </div>
    );
  }

  // Flatten every loaded page into one list of jobs.
  const jobs = data.pages.flatMap((page) => page.items);
  const totalCount = data.pages[0]?.totalCount ?? jobs.length;

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-display text-lg font-bold text-ink dark:text-slate-100">
          No jobs match these filters
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Try widening the salary floor, switching category, or turning off
          remote-only.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
        Showing {jobs.length} of {totalCount} {totalCount === 1 ? "job" : "jobs"}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isSelected={job.id === selectedJobId}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Invisible sentinel — when it scrolls into view the observer loads more. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />

      <div className="mt-6 flex justify-center">
        {isFetchingNextPage ? (
          <span className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-500" />
            Loading more jobs…
          </span>
        ) : !hasNextPage ? (
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
            All jobs loaded
          </span>
        ) : null}
      </div>
    </div>
  );
}
