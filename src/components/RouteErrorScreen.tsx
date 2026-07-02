"use client";

// =============================================================
// src/components/RouteErrorScreen.tsx
// Assignment 3.4, Part 2 Step 4 — the shared body of the route-specific error
// boundaries. Each authenticated route's `error.tsx` is a thin wrapper that
// passes its persona-specific copy (what role is required, where "back" goes) to
// this component, which does the ApiError.code branching once, correctly:
//
//   UNAUTHORIZED → "Session Expired" + Link to /login          (NO retry button)
//   FORBIDDEN    → route-specific "Access Denied" + back Link  (NO retry button)
//   NOT_FOUND    → "<Resource> Not Found" + back Link
//   fallback     → error.message + "Try again" (reset) + back Link
//
// RULE (assignment): never show a retry for UNAUTHORIZED or FORBIDDEN —
// re-rendering produces the exact same error, so retry is a dead end. Those two
// cases offer a real next action (sign in / go back) instead.
// =============================================================

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, LogIn, ShieldX, SearchX } from "lucide-react";
import { ApiError } from "@/lib/api-error";

export interface RouteErrorScreenProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Singular resource noun for the NOT_FOUND heading, e.g. "Application". */
  resource: string;
  /** Where the non-retry actions send the user (a list they can recover to). */
  backHref: string;
  backLabel: string;
  /** Route-specific 403 copy (which role is required and why). */
  forbiddenHeading: string;
  forbiddenMessage: string;
  /** Optional override for the NOT_FOUND body copy. */
  notFoundMessage?: string;
}

export default function RouteErrorScreen({
  error,
  reset,
  resource,
  backHref,
  backLabel,
  forbiddenHeading,
  forbiddenMessage,
  notFoundMessage,
}: RouteErrorScreenProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const code = error instanceof ApiError ? error.code : "UNKNOWN";

  // ---- UNAUTHORIZED: the session is gone; a retry can't fix that. ------------
  if (code === "UNAUTHORIZED") {
    return (
      <Shell icon={<LogIn className="h-7 w-7" />} heading="Session Expired">
        <p className={bodyClass}>Your session has expired. Please sign in again.</p>
        <Actions>
          <PrimaryLink href="/login">Sign in</PrimaryLink>
        </Actions>
      </Shell>
    );
  }

  // ---- FORBIDDEN: wrong role; a retry can't fix that either. -----------------
  if (code === "FORBIDDEN") {
    return (
      <Shell icon={<ShieldX className="h-7 w-7" />} heading={forbiddenHeading}>
        <p className={bodyClass}>{forbiddenMessage}</p>
        <Actions>
          <PrimaryLink href={backHref}>{backLabel}</PrimaryLink>
        </Actions>
      </Shell>
    );
  }

  // ---- NOT_FOUND: the resource is gone; send them back to the list. ---------
  if (code === "NOT_FOUND") {
    return (
      <Shell icon={<SearchX className="h-7 w-7" />} heading={`${resource} Not Found`}>
        <p className={bodyClass}>
          {notFoundMessage ??
            `We couldn't find that ${resource.toLowerCase()}. It may have been removed or the link is incorrect.`}
        </p>
        <Actions>
          <PrimaryLink href={backHref}>{backLabel}</PrimaryLink>
        </Actions>
      </Shell>
    );
  }

  // ---- Fallback (VALIDATION/CONFLICT/SERVER/UNKNOWN): retry is worth offering.
  return (
    <Shell icon={<TriangleAlert className="h-7 w-7" />} heading="Something went wrong">
      <p className={bodyClass}>
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Actions>
        <button type="button" onClick={() => reset()} className={primaryClass}>
          Try again
        </button>
        <Link href={backHref} className={secondaryClass}>
          {backLabel}
        </Link>
      </Actions>
    </Shell>
  );
}

// ---- small presentational helpers ------------------------------------------

const bodyClass =
  "mx-auto mt-2 max-w-md break-words text-sm text-slate-600 dark:text-slate-400";
const primaryClass =
  "inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";
const secondaryClass =
  "inline-flex rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10";

function Shell({
  icon,
  heading,
  children,
}: {
  icon: React.ReactNode;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16 text-center">
      <div>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {icon}
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink dark:text-slate-100">
          {heading}
        </h1>
        {children}
      </div>
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex items-center justify-center gap-3">{children}</div>;
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={primaryClass}>
      {children}
    </Link>
  );
}
