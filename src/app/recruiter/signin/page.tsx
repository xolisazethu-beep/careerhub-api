// =============================================================
// src/app/recruiter/signin/page.tsx
// Recruiter sign-in. Stores a (demo-only) recruiter session in the
// store and routes to the dashboard. Not real authentication.
// =============================================================
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Building2 } from "lucide-react";
import { signInRecruiter } from "@/lib/careerhub-store";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";

export default function RecruiterSignInPage() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!company.trim() || !email.trim() || !password) {
      setError("Please fill in every field.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid work email.");
      return;
    }
    signInRecruiter({ company: company.trim(), email: email.trim() });
    router.push("/recruiter");
  }

  return (
    <main className="grid min-h-[70vh] place-items-center bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-[#1a1133]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Building2 className="h-5 w-5 text-white" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Recruiter sign in</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in to post roles and review applicants.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="company" className="block text-sm font-medium">
              Company name
            </label>
            <input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133]"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
