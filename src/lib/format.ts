/**
 * Pure formatting helpers. No component imports these for layout — only for
 * turning raw interface values into human-readable strings. Keeping them here
 * means the same logic is testable in isolation and reused by every card.
 */

/**
 * Format a single rand amount with space thousands separators and no decimals.
 * 45000 -> "R45 000"
 */
function formatRand(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `R${grouped}`;
}

/**
 * Format a salary range the way South African listings read.
 * (45000, 65000) -> "R45 000 – R65 000 pm"
 * If min === max, a single figure is shown.
 */
export function formatSalaryRange(min: number, max: number): string {
  if (min === max) {
    return `${formatRand(min)} pm`;
  }
  return `${formatRand(min)} – ${formatRand(max)} pm`;
}

/**
 * Turn an ISO 8601 date into a relative label, computed against "now".
 * Never hardcoded — re-derives every render.
 * Examples: "today", "yesterday", "3 days ago", "2 months ago".
 */
export function formatRelativeDate(isoDate: string, now: Date = new Date()): string {
  const posted = new Date(isoDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = now.getTime() - posted.getTime();
  const days = Math.floor(diffMs / msPerDay);

  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/**
 * Format an ISO 8601 closing date as a short human label, e.g.
 *   "Closes today" / "Closes tomorrow" / "Closes in 5 days" / "Closes 12 Aug 2026" / "Closed".
 * Used for the small footer hint on a card and the detail panel.
 */
export function formatClosingDate(isoDate: string, now: Date = new Date()): string {
  const closes = new Date(isoDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  // Compare at day granularity in the user's locale, ignoring time of day.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfClose = new Date(closes.getFullYear(), closes.getMonth(), closes.getDate());
  const days = Math.round((startOfClose.getTime() - startOfToday.getTime()) / msPerDay);

  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 14) return `Closes in ${days} days`;

  const long = closes.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Closes ${long}`;
}