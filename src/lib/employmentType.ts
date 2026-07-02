import type { EmploymentType } from "@/types";

/**
 * One source of truth for the *human label* of each employment type.
 *
 * This is a `Record<EmploymentType, string>`, so it is EXHAUSTIVE by
 * construction: if the API enum gains a new value (say "Freelance") and we widen
 * the `EmploymentType` union, TypeScript immediately flags this object as missing
 * a key and the build fails until the new label is added.
 *
 * The *colour* of each employment-type badge lives in `JobStatusBadge.tsx` — the
 * single authoritative visual representation. Label text and colour are the two
 * separate concerns, each owned in exactly one place.
 */
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FullTime: "Full-time",
  PartTime: "Part-time",
  Contract: "Contract",
  Internship: "Internship",
  Learnership: "Learnership",
};

/**
 * Assignment 3.4, Part 3 — coerce the API's loosely-typed `type` field (the
 * generated DTO types it as a plain `string`) into the strict `EmploymentType`
 * union the UI relies on. This is a runtime-VALIDATED narrowing (a type guard),
 * not a blind `as` cast: an unrecognised value falls back to "FullTime" rather
 * than smuggling an off-contract string into the view-model.
 */
export function toEmploymentType(value: string): EmploymentType {
  for (const known of Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]) {
    if (known === value) return known;
  }
  return "FullTime";
}
