import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` — the shadcn/ui class-composition helper.
 *
 * It runs two libraries in sequence:
 *  1. `clsx`          — flattens conditional inputs (strings, arrays, objects
 *                       like `{ "ring-1": isSelected }`) into a single class
 *                       string, dropping any falsy entries.
 *  2. `twMerge`       — resolves *conflicting* Tailwind utilities so the last
 *                       one wins. e.g. `cn("border-slate-200", "border-brand-600")`
 *                       returns only `"border-brand-600"`, never both. Plain
 *                       string concatenation would emit both classes and let
 *                       stylesheet source-order — not call-order — decide the
 *                       winner, which is unreliable.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
