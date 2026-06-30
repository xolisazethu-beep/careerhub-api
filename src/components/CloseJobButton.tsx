"use client";

// =============================================================
// src/components/CloseJobButton.tsx
// Assignment 3.1 — Parts 2 + 4a.
//
// Closing a listing is destructive and irreversible, so it now goes through an
// AlertDialog confirmation, and its feedback is a sonner TOAST (the old inline
// success/error banners are gone).
//
// THE SERVER-ACTION + PORTAL PROBLEM (Q3): AlertDialogContent renders in a Radix
// portal at the end of <body>, OUTSIDE any <form>. A type="submit" button in
// that portal is attached to no form, so it can't drive the close Server Action.
// SOLUTION (chosen): keep the Server Action, control the dialog with useState,
// and on confirm call the action PROGRAMMATICALLY inside useTransition — no form
// submission, so the portal boundary is irrelevant. isPending drives the
// in-flight UI; the result becomes a toast.
// =============================================================

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { closeJobListing } from "@/app/actions/closeJob";
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

export default function CloseJobButton({
  jobId,
  currentStatus,
}: {
  jobId: string;
  currentStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [closedTitle, setClosedTitle] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Already closed (either from the start, or after we just closed it) →
  // show a static confirmation in this column, no button.
  if (currentStatus === "Closed" || closedTitle !== null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Closed “{closedTitle ?? "this listing"}”
      </span>
    );
  }

  function handleConfirm() {
    const fd = new FormData();
    fd.set("jobId", jobId);
    // Async Server Action invoked inside the transition — NOT via form submit.
    startTransition(async () => {
      const result = await closeJobListing(null, fd);
      if (result?.status === "success") {
        toast.success(`Closed “${result.jobTitle}”`, {
          description: "The listing has been removed from the public board.",
        });
        setClosedTitle(result.jobTitle);
        setOpen(false);
      } else {
        toast.error(result?.message ?? "Couldn't close the listing.");
        setOpen(false);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          Close listing
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close this listing?</AlertDialogTitle>
          <AlertDialogDescription>
            This listing will be marked as closed and removed from the public
            jobs board. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep listing</AlertDialogCancel>
          {/* No type="submit": this lives in a portal outside any form. We
              preventDefault so Radix doesn't auto-close while the action runs,
              then close it ourselves once the transition settles. */}
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {isPending && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            {isPending ? "Closing…" : "Close listing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
