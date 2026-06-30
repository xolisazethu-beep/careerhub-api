"use client";

// =============================================================
// src/components/profile/DocUpload.tsx
// A single qualification-document slot (PDF). Handles picking a file, validating
// it (PDF only, size-capped), turning it into a base64 data URL via the store's
// helper, and showing the uploaded state with View / Replace / Remove controls.
// The parent owns the value; this widget is fully controlled.
// =============================================================

import { useRef, useState } from "react";
import { FileText, UploadCloud, Check, X, Eye, AlertTriangle } from "lucide-react";
import {
  fileToDataUrl,
  MAX_PDF_BYTES,
  type UploadedDoc,
} from "@/lib/profile-store";

interface DocUploadProps {
  label: string;
  /** Optional "(required)" / "(optional)" hint shown next to the label. */
  hint?: string;
  value: UploadedDoc | null;
  onChange: (doc: UploadedDoc | null) => void;
}

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocUpload({ label, hint, value, onChange }: DocUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const doc = await fileToDataUrl(file, { accept: "pdf", maxBytes: MAX_PDF_BYTES });
      onChange(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className={
        "rounded-xl border p-4 transition " +
        (value
          ? "border-emerald-400/60 bg-emerald-50/60 dark:border-emerald-700/50 dark:bg-emerald-950/20"
          : "border-slate-300 bg-white dark:border-white/10 dark:bg-[#0f0a1e]")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={
              "flex h-9 w-9 items-center justify-center rounded-lg " +
              (value
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "bg-brand-500/10 text-brand-600 dark:text-brand-300")
            }
          >
            {value ? <Check className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {label}
              {hint && (
                <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span>
              )}
            </p>
            {value ? (
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {value.fileName} · {prettySize(value.size)}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-400">PDF, up to 4 MB</p>
            )}
          </div>
        </div>

        {value ? (
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <a
              href={value.dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </a>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <UploadCloud className="h-4 w-4" /> {busy ? "Uploading…" : "Upload"}
          </button>
        )}
      </div>

      {value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Replace file
        </button>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
