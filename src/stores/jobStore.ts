import { create } from "zustand";

/**
 * Client-only UI state for the /jobs/explore board (Week 2 Day 4, Concept 2).
 *
 * This is CLIENT state — which job row is selected and whether the detail panel
 * is open — so it lives in Zustand, NOT in TanStack Query (which owns SERVER
 * state: the job data itself). Keeping the two separate is the whole point of the
 * exercise: the store never holds the job payload, only the *id* of the selection;
 * the panel then fetches that job through React Query.
 *
 * Consumers must read this store with INDIVIDUAL selectors
 * (`useJobStore((s) => s.selectedJobId)`) rather than destructuring the whole
 * store, so a component re-renders only when the slice it actually uses changes.
 */
export interface JobStore {
  /** The id of the job whose detail is shown in the panel, or null when none. */
  selectedJobId: string | null;
  /** Whether the right-hand detail panel is visible. */
  isDetailPanelOpen: boolean;

  /** Select a job (does not by itself open the panel — callers pair the two). */
  setSelectedJobId: (id: string | null) => void;
  /** Open the detail panel. */
  openDetailPanel: () => void;
  /** Close the detail panel (selection is kept so re-opening is instant). */
  closeDetailPanel: () => void;
}

/**
 * The v5 `create<T>()(...)` double-call form. The extra `()` lets TypeScript
 * infer the store type from the explicit `JobStore` parameter while still
 * allowing middleware to be added later without changing the call shape.
 */
export const useJobStore = create<JobStore>()((set) => ({
  selectedJobId: null,
  isDetailPanelOpen: false,

  setSelectedJobId: (id) => set({ selectedJobId: id }),
  openDetailPanel: () => set({ isDetailPanelOpen: true }),
  closeDetailPanel: () => set({ isDetailPanelOpen: false }),
}));
