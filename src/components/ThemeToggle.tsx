"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "careerhub:theme";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle() {
  // `isDark` is NOT the source of truth for dark mode — the `.dark` class on
  // <html> is. This state exists purely so the button can RE-RENDER its own
  // label and icon to match the real DOM class. It always starts `false` so the
  // server and first client render agree (no hydration mismatch); the mount
  // effect immediately corrects it to the true value.
  const [isDark, setIsDark] = useState(false);

  // First mount only (`[]`): resolve and APPLY the user's preferred theme.
  // 1. An explicit stored choice in localStorage always wins.
  // 2. Otherwise fall back to the OS preference via `prefers-color-scheme`.
  // The inline boot script in layout.tsx already applied this before paint to
  // avoid a flash; doing it here too keeps ThemeToggle self-contained and keeps
  // `isDark` in sync with the class that is actually on <html>.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      stored === "dark" ||
      (stored === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", prefersDark);
    setIsDark(prefersDark);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    // Persist the user's explicit choice so it survives reloads and new tabs.
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      // aria-label describes the ACTION the click performs, not the current
      // state — so a screen-reader user knows what pressing it will do.
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-brand-500"
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      {/* Text reflects the CURRENT mode, not a static label. */}
      <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
