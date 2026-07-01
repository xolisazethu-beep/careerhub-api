"use client";

// =============================================================
// src/components/profile/ResumeBanner.tsx
// "Pick up where you left off" banner. Reads the signed-in user's most recent
// unfinished application DRAFT from localStorage and, if there is one, invites
// them straight back into that apply form. Renders nothing when the user is
// signed out or has no draft — safe to drop on any page.
// =============================================================

import Link from "next/link";
import { useEffect, useState } from "react";
import { History, ArrowRight, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { getLatestDraft, type ApplicationDraft } from "@/lib/profile-store";

export default function ResumeBanner() {
  const { data: session, status } = useSession();
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const email = session?.user?.email;
    if (status !== "loading" && email) setDraft(getLatestDraft(email));
  }, [status, session]);

  if (!draft || dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800/60 dark:bg-amber-950/30">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-md p-1 text-amber-700/70 hover:bg-amber-500/10 dark:text-amber-300/70"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300">
          <History className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-amber-900 dark:text-amber-200">
            You have an unfinished application
          </h3>
          <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
            You started applying for{" "}
            <span className="font-semibold">{draft.jobTitle}</span>
            {draft.company ? ` at ${draft.company}` : ""} but didn&apos;t submit it.
            Continue right where you stopped.
          </p>
          <Link
            href={`/apply/${draft.jobId}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Resume application <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
