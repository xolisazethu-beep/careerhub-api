"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="CareerHub home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            d="M4 8.5a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5h3a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M4 12h16" stroke="currentColor" strokeWidth="1.7" />
          <path d="M11 6.5h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">
        Career<span className="text-brand-700">Hub</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { user, isReady, signOut } = useAuth();
  const { notify } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    setMenuOpen(false);
    notify("You have been signed out.", "info");
  };

  const initials = user
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <div className="flex items-center gap-2 sm:gap-3">
          {!isReady ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-brand-700"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
