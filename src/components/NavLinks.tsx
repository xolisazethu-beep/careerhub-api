"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * NavLinks — the header's primary navigation (Assignment 2.1 → 2.3).
 *
 * `usePathname` is a hook, so this is a Client Component. As of Assignment 2.3
 * the LINK SET is no longer hardcoded here — it is decided by ROLE in the
 * (server) Navbar from `await auth()` and passed in as a prop. That keeps the
 * "who sees which link" decision on the server (where the session lives) while
 * this island still owns only the client concern: highlighting the active link
 * on navigation without a reload.
 */
export interface NavLink {
  href: string;
  label: string;
}

export default function NavLinks({ links }: { links: readonly NavLink[] }) {
  const pathname = usePathname();

  // The active link is the one whose href is the LONGEST prefix of the current
  // path, so /jobs/explore highlights "Explore" (not also "Jobs", whose href is
  // a shorter prefix).
  const activeHref = links
    .map((l) => l.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (links.length === 0) return null;

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {links.map(({ href, label }) => {
        const isActive = href === activeHref;
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
