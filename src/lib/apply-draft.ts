// =============================================================
// src/lib/apply-draft.ts
// "Save as Draft" persistence for the Job Application Wizard.
//
// ⚠️ LOCALSTORAGE FALLBACK. The real backend owns drafts via
//    POST /api/applications/draft  and  PUT /api/applications/{id}/draft
//    (see docs/BACKEND-GAPS.md §Feature 2). Until those ship, the wizard
//    stores its in-progress answers here, keyed by `${email}::${jobId}`.
//
// Note: uploaded PDFs are NOT persisted in the draft — base64 data URLs would
// blow the ~5 MB localStorage budget. Only the form fields and the current step
// survive a reload; documents are re-attached on return. The real backend
// persists the files. This is surfaced to the user in the wizard UI.
// =============================================================

import type { WizardValues } from "@/lib/apply-wizard";

const DRAFT_KEY = "careerhub_wizard_drafts";

export interface WizardDraft {
  jobId: string;
  jobTitle: string;
  company: string;
  /** Owner email, lower-cased. */
  email: string;
  /** Partial wizard answers, restored verbatim into the form. */
  values: Partial<WizardValues>;
  /** The step the user was last on (0-based). */
  step: number;
  updatedAt: string;
}

type DraftMap = Record<string, WizardDraft>;

function read(): DraftMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftMap) : {};
  } catch {
    return {};
  }
}

function write(map: DraftMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(map));
  } catch {
    /* quota / unavailable — non-fatal */
  }
}

function key(email: string, jobId: string): string {
  return `${email.trim().toLowerCase()}::${jobId}`;
}

export function getWizardDraft(email: string, jobId: string): WizardDraft | null {
  if (!email) return null;
  return read()[key(email, jobId)] ?? null;
}

export function saveWizardDraft(draft: Omit<WizardDraft, "updatedAt">): void {
  const map = read();
  map[key(draft.email, draft.jobId)] = {
    ...draft,
    email: draft.email.trim().toLowerCase(),
    updatedAt: new Date().toISOString(),
  };
  write(map);
}

export function clearWizardDraft(email: string, jobId: string): void {
  const map = read();
  delete map[key(email, jobId)];
  write(map);
}
