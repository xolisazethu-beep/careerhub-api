"use client";

import { useEffect } from "react";
import type { JobListing } from "@/types";

export interface ApplyModalProps {
  job: JobListing | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export default function ApplyModal({ job, onClose, onConfirm }: ApplyModalProps) {
  useEffect(() => {
    if (!job) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [job, onClose]);

  if (!job) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="apply-modal-title" className="font-display text-lg font-bold text-ink">
          Apply for this role
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          You&apos;re applying to <span className="font-semibold text-ink">{job.title}</span> at{" "}
          <span className="font-semibold text-ink">{job.company}</span>. In a later milestone this
          will submit to the CareerHub applications API.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(job.id)}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            Submit application
          </button>
        </div>
      </div>
    </div>
  );
}
