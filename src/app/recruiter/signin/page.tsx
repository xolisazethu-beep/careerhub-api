// =============================================================
// src/app/recruiter/signin/page.tsx
// Employer authentication against the REAL CareerHub backend.
// Login or register (bound to a company); on success a JWT is stored
// by EmployerAuthContext and the recruiter lands on the dashboard,
// from where they can post a job straight to POST /api/jobs.
// =============================================================
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, Eye, EyeOff } from "lucide-react";
import { useEmployerAuth } from "@/context/EmployerAuthContext";
import { fetchCompanies, type CompanyOption } from "@/lib/employer-api";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";

type Mode = "login" | "register";

export default function RecruiterSignInPage() {
  const router = useRouter();
  const { login, register } = useEmployerAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Company picker is only needed for registration; load the list lazily the
  // first time the user switches into register mode.
  useEffect(() => {
    if (mode !== "register" || companies.length > 0) return;
    fetchCompanies()
      .then(setCompanies)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Couldn't load companies."),
      );
  }, [mode, companies.length]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid work email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (mode === "register" && (!fullName.trim() || !companyId)) {
      setError("Please enter your name and choose your company.");
      return;
    }

    setBusy(true);
    try {
      const auth =
        mode === "login"
          ? await login(email.trim(), password)
          : await register({
              fullName: fullName.trim(),
              email: email.trim(),
              password,
              companyId,
            });

      if (auth.role !== "Employer") {
        setError(
          "That account is not an employer account. Use an employer login to post jobs.",
        );
        setBusy(false);
        return;
      }
      router.push("/recruiter");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[70vh] place-items-center bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-[#1a1133]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Building2 className="h-5 w-5 text-white" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">
          {mode === "login" ? "Employer sign in" : "Create employer account"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {mode === "login"
            ? "Sign in to post roles to the live job board."
            : "Register against your company to post roles."}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}

          {mode === "register" && (
            <>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium">
                  Full name
                </label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium">
                  Company
                </label>
                <select
                  id="company"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select your company…</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.city}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 mt-1.5 flex items-center px-3 text-slate-400 transition hover:text-slate-600 focus:outline-none dark:hover:text-slate-200"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133] dark:disabled:bg-slate-600"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          {mode === "login" ? "New employer?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          Demo employer: <span className="font-mono">demo.employer@takealot.co.za</span>{" "}
          / <span className="font-mono">DemoPass123!</span>
        </p>
      </div>
    </main>
  );
}
