import type { EmploymentType } from "@/types";

/**
 * One source of truth for how each employment type looks and reads.
 *
 * This is a `Record<EmploymentType, ...>`, so it is EXHAUSTIVE by construction:
 * if the API enum gains a new value (say "Freelance") and we widen the
 * `EmploymentType` union, TypeScript immediately flags this object as missing
 * a key and the build fails until the new style is added. The badge colour is
 * therefore never hardcoded per card — every card derives it from this map.
 *
 * Full Tailwind class strings are written out (not concatenated) so the v4
 * engine can see and keep them.
 */
interface EmploymentTypeStyle {
  label: string;
  badge: string;
}

export const EMPLOYMENT_TYPE_STYLES: Record<EmploymentType, EmploymentTypeStyle> = {
  FullTime: {
    label: "Full-time",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  PartTime: {
    label: "Part-time",
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  Contract: {
    label: "Contract",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  Internship: {
    label: "Internship",
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
};
