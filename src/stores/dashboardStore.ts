import { create } from "zustand";

/**
 * Employer dashboard UI preferences (Assignment 2.3, Part 7).
 *
 * This is SESSION-LEVEL UI state: how the employer wants to look at their
 * listings right now (table vs. grid, whether closed jobs are shown). It is NOT
 * user data and NOT something the server needs to know — so it lives in an
 * in-memory Zustand store, shared across the dashboard's client components.
 *
 * NO `persist` middleware on purpose: the preference should survive in-app
 * NAVIGATION (the store is a module singleton, so leaving and returning to the
 * dashboard keeps it) but RESET on a full refresh — a fresh visit starts from
 * the sensible default ("table"). If we ever wanted it to outlive a refresh, the
 * right move would be persist({ name: "careerhub-dashboard-prefs" }) to
 * localStorage (see Stretch B) — but a refresh-resetting view toggle is exactly
 * what session-level memory is for.
 */
export interface DashboardStore {
  /** Current layout mode for the listings. */
  view: "table" | "grid";
  setView: (view: "table" | "grid") => void;
  /** Whether closed listings are included in the view. */
  showClosedJobs: boolean;
  toggleShowClosedJobs: () => void;
}

export const useDashboardStore = create<DashboardStore>()((set) => ({
  view: "table",
  setView: (view) => set({ view }),
  showClosedJobs: true,
  toggleShowClosedJobs: () =>
    set((state) => ({ showClosedJobs: !state.showClosedJobs })),
}));
