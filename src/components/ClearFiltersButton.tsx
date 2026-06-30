"use client";

// =============================================================
// src/components/ClearFiltersButton.tsx
// Assignment 3.1, Part 5 — resets EVERY /jobs filter (nuqs param) at once.
// Lives in the "no results from your filters" empty state. It writes the same
// three nuqs keys JobFilters owns; setting each to null removes the param from
// the URL (back to defaults), and `shallow: false` triggers the server
// re-fetch so the full jobs list renders.
// =============================================================

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryStates, parseAsString, parseAsStringLiteral } from "nuqs";
import { X } from "lucide-react";

const STATUS = ["open", "all"] as const;

export default function ClearFiltersButton() {
  const router = useRouter();
  const [, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      location: parseAsString.withDefault(""),
      status: parseAsStringLiteral(STATUS).withDefault("all"),
    },
    { shallow: false },
  );
  const [isPending, startTransition] = useTransition();

  function clearAll() {
    startTransition(async () => {
      // null on each key strips it from the URL; the server component re-runs.
      await setFilters({ q: null, location: null, status: null });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={clearAll}
      disabled={isPending}
      className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <X className="h-4 w-4" /> Clear all filters
    </button>
  );
}
