"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * NavLinks — the header's primary navigation (Assignment 2.1, Part 6 + Stretch A).
 *
 * `usePathname` is a hook, so the component that calls it MUST be a Client
 * Component — hence "use client" here. It is intentionally a small leaf: the
 * root layout and Navbar stay Server/Client as they were, and only this tiny
 * island re-renders on navigation to move the active highlight. Each route swap
 * updates the highlight WITHOUT a page reload, because App Router navigations
 * are client-side transitions.
 */
const LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/dashboard/listings", label: "Dashboard" },
] as const;

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {LINKS.map(({ href, label }) => {
        // Highlight when on the link's section (e.g. /dashboard/listings/… also
        // lights up "Dashboard"). The base href is matched as a path prefix.
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
