"use client";

import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboardStore";

/**
 * DashboardToolbar — the controls for the listings view (Assignment 2.3, Part 7).
 *
 * Reads the Zustand store with ONE selector per value (not destructuring the
 * whole store), so this component re-renders only when the specific slice it
 * uses changes. Because the store is a module singleton, the table/grid below it
 * reads the SAME state — toggling here updates the view without any props.
 */
export default function DashboardToolbar() {
  const view = useDashboardStore((s) => s.view);
  const setView = useDashboardStore((s) => s.setView);
  const showClosedJobs = useDashboardStore((s) => s.showClosedJobs);
  const toggleShowClosedJobs = useDashboardStore((s) => s.toggleShowClosedJobs);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
        <button
          type="button"
          onClick={() => setView("table")}
          aria-pressed={view === "table"}
          className={
            view === "table"
              ? "inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
              : "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
          }
        >
          <TableIcon className="h-4 w-4" /> Table
        </button>
        <button
          type="button"
          onClick={() => setView("grid")}
          aria-pressed={view === "grid"}
          className={
            view === "grid"
              ? "inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white"
              : "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
          }
        >
          <LayoutGrid className="h-4 w-4" /> Grid
        </button>
      </div>

      {/* Show closed jobs */}
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={showClosedJobs}
          onChange={toggleShowClosedJobs}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30 dark:border-slate-600"
        />
        Show closed jobs
      </label>
    </div>
  );
}
