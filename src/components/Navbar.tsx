// =============================================================
// src/components/Navbar.tsx
// Dark-purple top bar + slide-out menu. As of Assignment 2.3 the
// account area and primary links are driven by the Auth.js SESSION
// (passed in from the async root layout's await auth()), not the old
// applicant context — so the nav reflects the real signed-in role.
// =============================================================
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Session } from "next-auth";
import {
  Menu as MenuIcon,
  X,
  Search,
  Users,
  Info,
  Mail,
  Laptop,
  Code2,
  LogOut,
  UserCircle,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import NavLinks, { type NavLink } from "@/components/NavLinks";
import { signOutAction } from "@/app/actions/auth";

const menuItems = [
  { label: "Find a Job", href: "/", icon: Search },
  { label: "Employers and Recruiters", href: "/recruiter", icon: Users },
  { label: "About Us", href: "/about", icon: Info },
  { label: "Contact Us", href: "/contact", icon: Mail },
];

/** Primary links shown per role (Part 5): Dashboard for employers, Jobs for
 *  candidates, Jobs only for signed-out visitors. Never both Dashboard+Jobs. */
function linksForRole(role: string | undefined): NavLink[] {
  if (role === "employer") return [{ href: "/dashboard/listings", label: "Dashboard" }];
  if (role === "candidate")
    return [
      { href: "/jobs", label: "Jobs" },
      { href: "/jobs/explore", label: "Explore" },
    ];
  return [{ href: "/jobs", label: "Jobs" }];
}

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
  const links = linksForRole(role);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-violet-500/20 bg-gradient-to-r from-[#1c0f33] via-[#140a24] to-[#1c0f33] px-4 py-3 text-white">
        {/* Brand — laptop-with-code mark + gradient wordmark */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
            <Laptop className="h-5 w-5 text-white" />
            <Code2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded bg-[#140a24] p-0.5 text-fuchsia-300" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
              Career
            </span>
            <span className="text-white">Hub</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Role-based primary navigation. Active link highlighted by NavLinks. */}
          <NavLinks links={links} />

          {/* Candidates can track their applications. */}
          {role === "candidate" && (
            <Link
              href="/applications"
              className="hidden rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/10 sm:inline-block"
            >
              Track applications
            </Link>
          )}

          <ThemeToggle />

          {isLoggedIn && role ? (
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="flex items-center gap-2 text-sm">
                <UserCircle className="h-5 w-5 text-white/80" />
                <span className="max-w-[10rem] truncate font-medium">{name}</span>
                <RoleBadge role={role} />
              </span>
              {/* Sign Out is a Server Action form — clears the cookie server-side
                  and redirects to "/". */}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-sm font-semibold hover:bg-violet-600 sm:inline-flex"
            >
              <UserCircle className="h-4 w-4" />
              Sign in
            </Link>
          )}

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
          <nav className="absolute right-0 top-0 h-full w-full max-w-md bg-white text-slate-800 shadow-xl dark:bg-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between bg-[#2b3543] px-5 py-4 text-white">
              <span className="text-lg font-semibold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Account summary */}
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
              {menuItems.map(({ label, href, icon: Icon }) => (
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
              {role === "candidate" && (
                <li className="border-b border-slate-100 dark:border-slate-800">
                  <Link
                    href="/applications"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 sm:hidden"
                  >
                    <UserCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    <span>Track applications</span>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
