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
