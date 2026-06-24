import { Suspense } from "react";
import type { Metadata } from "next";
import ApplicationsSummary, {
  ApplicationsSummarySkeleton,
} from "@/components/ApplicationsSummary";
import ListingsTable, {
  ListingsTableSkeleton,
} from "@/components/ListingsTable";

export const metadata: Metadata = {
  title: "All listings — Employer Dashboard",
};

// Forced dynamic so `next build` never tries to fetch this app's own API before
// the server is listening; the data is fetched per-request and STREAMED. The
// jobs fetch inside ListingsTable is still tagged "jobs", so the close action's
// revalidateTag continues to govern the candidate /jobs board's cache.
export const dynamic = "force-dynamic";

/**
 * /dashboard/listings — streamed employer dashboard (Assignment 2.2, Part 5).
 *
 * The page itself performs NO awaits: it renders the heading immediately and
 * hands each data source to its OWN Suspense boundary. The server streams the
 * shell first, then each boundary's HTML as that component's fetch resolves —
 * so the fast ApplicationsSummary appears before the slower ListingsTable,
 * instead of the whole page waiting on the slowest fetch.
 */
export default async function DashboardListingsPage() {
  return (
    <section>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink dark:text-slate-100">
          All Listings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Live application counts and one-click listing controls.
        </p>
      </header>

      {/* Boundary 1 — the fast stat card. Resolves first. */}
      <Suspense fallback={<ApplicationsSummarySkeleton />}>
        <ApplicationsSummary />
      </Suspense>

      {/* Boundary 2 — the slower joined table. Resolves independently, second. */}
      <Suspense fallback={<ListingsTableSkeleton />}>
        <ListingsTable />
      </Suspense>
    </section>
  );
}
