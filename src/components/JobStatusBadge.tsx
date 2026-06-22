import type { EmploymentType } from "@/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employmentType";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * JobStatusBadge — the single authoritative visual representation for the two
 * status signals a listing carries: its employment type and whether it is still
 * accepting applications.
 *
 * Both responsibilities live here on purpose. A card (or a summary panel, or a
 * search result) never decides what colour a "Contract" badge is or how a closed
 * listing reads — it asks this component. Change the scheme once, here, and every
 * call site updates.
 */

/**
 * The ONE place employment-type colour is defined.
 *
 * `Record<EmploymentType, string>` makes it exhaustive: widen the union and this
 * object stops compiling until the new colour is supplied. Each entry is a full,
 * static class string (light + dark) so the Tailwind v4 engine can see every
 * class — never built by concatenation. There is deliberately no `any` and no
 * conditional colour logic at any call site.
 */
const EMPLOYMENT_TYPE_BADGE: Record<EmploymentType, string> = {
  FullTime:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  PartTime:
    "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  Contract:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Internship:
    "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  Learnership:
    "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
};

interface EmploymentTypeBadgeProps {
  /** Typed as the union, never `string` — the call site cannot pass a bad value. */
  employmentType: EmploymentType;
  className?: string;
}

/**
 * Renders the employment-type badge. Colour derives ENTIRELY from
 * `employmentType` via the map above. `cn` merges the per-type colour over the
 * Badge's default colours so the type colour always wins.
 */
export function EmploymentTypeBadge({
  employmentType,
  className,
}: EmploymentTypeBadgeProps) {
  return (
    <Badge className={cn(EMPLOYMENT_TYPE_BADGE[employmentType], className)}>
      {EMPLOYMENT_TYPE_LABELS[employmentType]}
    </Badge>
  );
}

interface ActiveStatusBadgeProps {
  /** Whether the listing is still accepting applications. */
  isActive: boolean;
  className?: string;
}

/**
 * Renders a "Closed" badge ONLY when the listing is no longer active. When
 * `isActive` is true this returns `null` — nothing is rendered, so there is no
 * hidden element left in the DOM.
 */
export function ActiveStatusBadge({
  isActive,
  className,
}: ActiveStatusBadgeProps) {
  if (isActive) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
        className,
      )}
    >
      No longer accepting applications
    </Badge>
  );
}
