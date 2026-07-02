// =============================================================
// src/components/Navbar.tsx
// Dark-purple top bar + slide-out menu. As of Assignment 2.3 the
// account area and primary links are driven by the Auth.js SESSION
// (passed in from the async root layout's await auth()), not the old
// applicant context — so the nav reflects the real signed-in role.
//
// The top bar is intentionally minimal: brand + theme toggle + Menu.
// EVERY navigation and account action (Jobs, My profile, Track
// applications, the account summary and Sign out / Sign in) lives inside
// the slide-out Menu, so the bar stays uncluttered at any width.
// =============================================================
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Session } from "next-auth";
import {
  Menu as MenuIcon,
  X,
  Briefcase,
  LayoutDashboard,
  ClipboardList,
  Users,
  Info,
  Mail,
  LogOut,
  UserCircle,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { signOutAction } from "@/app/actions/auth";

type MenuEntry = {
  label: string;
  href: string;
  icon: typeof Briefcase;
};

/** Role-specific primary links — these were the inline top-bar buttons, now
 *  moved into the Menu. Employers get their Dashboard; candidates get Jobs plus
 *  their profile + applications; signed-out visitors just get Jobs. */
function primaryItems(role: string | undefined): MenuEntry[] {
  if (role === "employer") {
    return [{ label: "Dashboard", href: "/recruiter", icon: LayoutDashboard }];
  }
  if (role === "candidate") {
    return [
      { label: "Jobs", href: "/jobs", icon: Briefcase },
      { label: "My profile", href: "/profile", icon: UserCircle },
      { label: "Track applications", href: "/applications", icon: ClipboardList },
    ];
  }
  return [{ label: "Jobs", href: "/jobs", icon: Briefcase }];
}

/** General site links shown to everyone. "Find a Job" was removed because it
 *  duplicates the role-based "Jobs" link above. */
const generalItems: MenuEntry[] = [
  { label: "Employers and Recruiters", href: "/recruiter", icon: Users },
  { label: "About Us", href: "/about", icon: Info },
  { label: "Contact Us", href: "/contact", icon: Mail },
];

/** Small role pill next to the username. */
function RoleBadge({ role }: { role: "employer" | "candidate" }) {
  const isEmployer = role === "employer";
  return (
    <span
      className={
        isEmployer
          ? "rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200"
          : "rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200"
      }
    >
      {isEmployer ? "Employer" : "Candidate"}
    </span>
  );
}

export default function Navbar({ session }: { session: Session | null }) {
  const [open, setOpen] = useState(false);

  const role = session?.user?.role;
  const name = session?.user?.name ?? session?.user?.email ?? "Account";
  const isLoggedIn = Boolean(session);

  const primary = primaryItems(role);
  // Drop any general link that a primary link already covers (e.g. an employer's
  // Dashboard and "Employers and Recruiters" both point at /recruiter).
  const primaryHrefs = new Set(primary.map((i) => i.href));
  const general = generalItems.filter((i) => !primaryHrefs.has(i.href));
  const items = [...primary, ...general];

  return (
    <>
      {/* Top bar — brand on the left, theme toggle + Menu on the right. */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-violet-500/20 bg-gradient-to-r from-[#1c0f33] via-[#140a24] to-[#1c0f33] px-4 py-3 text-white">
        {/* Brand — CareerHubX magnifying-glass + person mark and wordmark */}
        <Link href="/" className="flex items-center" aria-label="CareerHubX home">
          <Logo onDark />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
            aria-label="Open menu"
          >
            <MenuIcon className="h-5 w-5" />
            Menu
          </button>
        </div>
      </header>

      {/* Slide-out menu */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white text-slate-800 shadow-xl dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between bg-[#2b3543] px-5 py-4 text-white">
              <span className="text-lg font-semibold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Account summary + Sign in / Sign out */}
            <div className="border-b border-slate-100 px-5 py-4 text-sm dark:border-slate-800">
              {isLoggedIn && role ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <UserCircle className="h-5 w-5 text-brand-600" />
                    <span className="truncate">{name}</span>
                    <RoleBadge role={role} />
                  </span>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline dark:text-brand-400"
                >
                  <UserCircle className="h-5 w-5" /> Sign in to your account
                </Link>
              )}
            </div>

            <ul>
              {items.map(({ label, href, icon: Icon }) => (
                <li
                  key={label}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
