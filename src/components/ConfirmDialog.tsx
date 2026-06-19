// =============================================================
// src/components/ConfirmDialog.tsx
// A small, reusable "are you sure?" pop-up. It dims the page behind
// it, shows a warning icon, a title and a message, and gives the user
// a Cancel and a Confirm button. It renders NOTHING when `open` is
// false, so it never sits hidden in the DOM. Used by the tracking page
// to confirm withdrawing an application, but generic enough for any
// destructive action.
// =============================================================
"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDialogProps {
  /** When false the component renders null — nothing appears on screen. */
  open: boolean;
  title: string;
  message: string;
  /** Text on the red confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Called when the user confirms the action. */
  onConfirm: () => void;
  /** Called when the user cancels (button, backdrop click, or Escape). */
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Let the user press Escape to dismiss. The listener is only attached while
  // the dialog is open and is cleaned up when it closes or unmounts.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      {/* Dimmed backdrop — clicking it cancels, just like pressing Cancel. */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-white/10 dark:bg-[#1a1133]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </span>

        <h2
          id="confirm-dialog-title"
          className="mt-4 text-lg font-bold text-slate-900 dark:text-white"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
