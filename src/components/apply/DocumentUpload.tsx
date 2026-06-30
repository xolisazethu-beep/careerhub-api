"use client";

// =============================================================
// src/components/apply/DocumentUpload.tsx
// One required-document slot for the wizard's Documents step.
//
//   • Drag-and-drop OR click to browse.
//   • PDF only, max 3 MB — validated inline (clear error text, not a toast).
//   • The display filename is auto-renamed to {userId}-{docType}.pdf, mirroring
//     how the backend sanitises uploads (it never trusts the client filename).
//   • Size shown in KB. REMOVE is guarded by an AlertDialog confirmation.
//
// Controlled: the parent owns the value (an UploadedDoc data URL) so the file
// survives step navigation. See apply-draft.ts for why files aren't persisted
// to drafts.
// =============================================================

import { useRef, useState } from "react";
import {
  FileText,
  UploadCloud,
  Check,
  Trash2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fileToDataUrl, type UploadedDoc } from "@/lib/profile-store";
import { MAX_DOC_BYTES, type DocumentType } from "@/lib/apply-wizard";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  docType: DocumentType;
  label: string;
  note?: string;
  /** Owner id used to build the sanitised display name. */
  userId: string;
  value: UploadedDoc | null;
  onChange: (doc: UploadedDoc | null) => void;
}

function prettyKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString()} KB`;
}

/** The server-style sanitised display name: {userId}-{docType}.pdf */
function displayName(userId: string, docType: string): string {
  const safeUser = (userId || "user").replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `${safeUser}-${docType}.pdf`;
}

export default function DocumentUpload({
  docType,
  label,
  note,
  userId,
  value,
  onChange,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function accept(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const doc = await fileToDataUrl(file, { accept: "pdf", maxBytes: MAX_DOC_BYTES });
      onChange(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition",
        value
          ? "border-brand-400/60 bg-brand-50/50 dark:border-brand-700/50 dark:bg-brand-950/20"
          : dragOver
            ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
            : "border-dashed border-slate-300 bg-white dark:border-white/15 dark:bg-[#0f0a1e]",
      )}
      onDragOver={(e) => {
        if (value) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (value) return;
        e.preventDefault();
        setDragOver(false);
        void accept(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
              value
                ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
            )}
          >
            {value ? <Check className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {label}
            </p>
            {note && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{note}</p>
            )}
            {value ? (
              <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-300">
                <span className="font-medium">{displayName(userId, docType)}</span>{" "}
                · {prettyKb(value.size)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Drag &amp; drop or browse · PDF only, up to 3 MB
              </p>
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this document?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ll need to upload {label} again before you can submit.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep file</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      onChange(null);
                      setError(null);
                    }}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

      {error && (
        <p
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
}
