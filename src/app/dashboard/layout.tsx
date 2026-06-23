import Link from "next/link";

/**
 * /dashboard layout — the persistent employer shell (Assignment 2.1, Part 5).
 *
 * This is a Server Component. It renders ONCE and then PERSISTS across every
 * navigation within /dashboard: moving between dashboard routes re-renders only
 * the `children` slot, while this layout's component function is NOT called
 * again, its DOM nodes are NOT recreated, and any state it held would NOT reset.
 * That is what "the sidebar does not re-render on navigation" means in React's
 * reconciler — the layout subtree is preserved and only the page below it swaps.
 *
 * It adds ONLY the two-column structure (sidebar + content). The outer page
 * shell — navbar, footer, padding — already comes from the root layout, so this
 * intentionally has no <main> wrapper of its own.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
      <aside className="lg:w-60 lg:shrink-0">
        <nav className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-20">
          <h2 className="px-2 font-display text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Employer Dashboard
          </h2>
          <ul className="mt-3 space-y-1">
            <li>
              <Link
                href="/dashboard/listings"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
              >
                All Listings
              </Link>
            </li>
            <li>
              <Link
                href="/recruiter"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
              >
                Post a Job
              </Link>
            </li>
            <li>
              <Link
                href="/jobs"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 dark:text-slate-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
              >
                View as Candidate
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
