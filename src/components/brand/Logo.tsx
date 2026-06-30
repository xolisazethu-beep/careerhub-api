// =============================================================
// src/components/brand/Logo.tsx
// CareerHubX brand mark — inline SVG so it scales crisply, themes with
// currentColor, and needs no PNG/network request.
//
//   <LogoMark />  — the icon only (a person silhouette inside a magnifying-glass
//                   ring). Use for favicons, the mobile nav, and tight spaces.
//   <Logo />      — the mark + the "CareerHubX" wordmark ("Career" in the brand
//                   violet, "HubX" in the darker accent). Use in headers/footers.
//
// Both accept className/size so callers control sizing. The mark uses the brand
// gradient stops defined inline; the wordmark uses Tailwind brand-* tokens so it
// follows light/dark theming.
// =============================================================

import { cn } from "@/lib/utils";

interface LogoMarkProps {
  /** Pixel size of the square mark. Defaults to 36. */
  size?: number;
  className?: string;
  /** Hide from the a11y tree when a visible wordmark already labels it. */
  "aria-hidden"?: boolean;
}

/** Icon-only brand mark: a person silhouette framed by a magnifying-glass ring. */
export function LogoMark({ size = 36, className, ...rest }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={rest["aria-hidden"] ? undefined : "CareerHubX"}
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id="chx-ring" x1="6" y1="6" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>

      {/* Magnifying-glass ring */}
      <circle cx="20" cy="20" r="14" stroke="url(#chx-ring)" strokeWidth="3.5" />
      {/* Glass handle */}
      <rect
        x="30.5"
        y="30.5"
        width="13"
        height="5"
        rx="2.5"
        transform="rotate(45 30.5 30.5)"
        fill="url(#chx-ring)"
      />
      {/* Person silhouette inside the lens — head + shoulders */}
      <circle cx="20" cy="16.5" r="4.2" fill="url(#chx-ring)" />
      <path
        d="M11.5 29.5c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8c0 .9-.7 1.6-1.6 1.6H13.1c-.9 0-1.6-.7-1.6-1.6Z"
        fill="url(#chx-ring)"
      />
    </svg>
  );
}

interface LogoProps {
  /** Pixel size of the mark. The wordmark scales with the surrounding font. */
  size?: number;
  className?: string;
  /** When true, the wordmark inherits `currentColor` instead of brand tokens —
   *  use on dark/branded bars (e.g. the navbar) where the bar sets the colour. */
  onDark?: boolean;
}

/** Full lockup: the mark plus the two-tone "CareerHubX" wordmark. */
export function Logo({ size = 32, className, onDark = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} aria-hidden />
      <span className="font-display text-xl font-extrabold tracking-tight">
        <span
          className={
            onDark
              ? "bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent"
              : "text-brand-600 dark:text-brand-400"
          }
        >
          Career
        </span>
        <span className={onDark ? "text-white" : "text-slate-900 dark:text-white"}>
          HubX
        </span>
      </span>
    </span>
  );
}

export default Logo;
