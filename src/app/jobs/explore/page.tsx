import type { Metadata } from "next";
import Link from "next/link";
import JobFilters from "@/components/explore/JobFilters";
import JobsExploreList from "@/components/explore/JobsExploreList";
import JobDetailPanel from "@/components/explore/JobDetailPanel";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employmentType";
import type { EmploymentType } from "@/types";

export const metadata: Metadata = {
  title: "Explore jobs — CareerHub",
  description:
    "Filter, scroll and manage live job listings — URL filters, infinite scroll and an instant detail panel.",
};

type SearchParams = {
  category?: string;
  minSalary?: string;
  remote?: string;
};

/**
 * /jobs/explore — the Week 2 Day 4 board, applying the four concepts to CareerHub:
 *   1. nuqs URL filters  (category / minSalary / remote live in the query string)
 *   2. Zustand selection + detail panel
 *   3. useInfiniteQuery pagination (IntersectionObserver auto-load)
 *   4. optimistic delete
 *
 * This is a Server Component. As the assignment requires, it AWAITS `searchParams`
 * (Next 15) and reads the three filter params server-side to render the summary
 * line below. The actual job fetch is a client `useInfiniteQuery` that hits
 * `/api/jobs/explore`, where the SAME params are applied server-side — so
 * filtering still happens on the server; the client only writes the URL (via the
 * `JobFilters` bar) and reads it back.
 */
export default async function ExploreJobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const category = (sp.category ?? "").trim();
  const minSalary = Number(sp.minSalary) || 0;
  const remote = sp.remote === "true";

  const activeBits: string[] = [];
  if (category && category in EMPLOYMENT_TYPE_LABELS) {
    activeBits.push(EMPLOYMENT_TYPE_LABELS[category as EmploymentType]);
  }
  if (minSalary > 0) activeBits.push(`R${minSalary.toLocaleString()}+`);
  if (remote) activeBits.push("Remote only");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink dark:text-slate-100 sm:text-4xl">
            Explore roles
          </h1>
          <Link
            href="/jobs"
            className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Classic board →
          </Link>
        </div>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {activeBits.length > 0
            ? `Filtered by ${activeBits.join(" · ")} — scroll to load more.`
            : "Filter by category, salary and location. Scroll to load more, click a role for details."}
        </p>
      </header>

      <div className="mb-6">
        <JobFilters />
      </div>

      {/* Two-column: the infinite list on the left, the detail panel on the right. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div>
          <JobsExploreList />
        </div>
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)]">
          <JobDetailPanel />
        </div>
      </div>
    </div>
  );
}
