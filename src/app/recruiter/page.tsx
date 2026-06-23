// =============================================================
// src/app/recruiter/page.tsx
// Employer dashboard. Requires a real employer session (JWT from the
// backend). A signed-in employer posts a job straight to the REAL API
// (POST /api/jobs) — it is written to Postgres and appears on the public
// board (/jobs) immediately, newest first. Below, the employer's own
// postings are listed with a live applicant count, linking to the
// applicant-review screen.
// =============================================================
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Plus, Users } from "lucide-react";
import { useEmployerAuth } from "@/context/EmployerAuthContext";
import {
  createJobListing,
  fetchCompanyJobs,
  type NewJobListing,
} from "@/lib/employer-api";
import type { EmploymentType } from "@/types";

const JOB_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "FullTime", label: "Full-time" },
  { value: "PartTime", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Internship", label: "Internship" },
  { value: "Learnership", label: "Learnership" },
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";

/** yyyy-mm-dd 30 days from now, for the closing-date input default. */
function defaultClosingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { employer, ready, logout } = useEmployerAuth();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<EmploymentType>("FullTime");
  const [skills, setSkills] = useState("");
  const [minExp, setMinExp] = useState("0");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  // Set the closing-date default on the client only (avoids an SSR/CSR date
  // mismatch from computing "today" during the server render).
  useEffect(() => {
    setClosingDate(defaultClosingDate());
  }, []);

  // Auth gate. Once the stored session is read, bounce anyone without an
  // employer session to sign-in.
  useEffect(() => {
    if (ready && !employer) router.replace("/recruiter/signin");
  }, [ready, employer, router]);

  const companyId = employer?.companyId ?? null;

  // This employer's postings, read from the real backend.
  const { data: jobs } = useQuery({
    queryKey: ["company-jobs", companyId],
    queryFn: () => fetchCompanyJobs(companyId!),
    enabled: !!companyId,
  });

  const postJob = useMutation({
    mutationFn: (body: NewJobListing) =>
      createJobListing(employer!.token, body),
    onSuccess: () => {
      // Refresh the employer's list AND the public board cache so the new job
      // shows up everywhere immediately.
      queryClient.invalidateQueries({ queryKey: ["company-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setTitle("");
      setLocation("");
      setType("FullTime");
      setSkills("");
      setMinExp("0");
      setSalaryMin("");
      setSalaryMax("");
      setDescription("");
      setRequirements("");
      setClosingDate(defaultClosingDate());
      setPosted(true);
    },
  });

  if (!ready || !employer) return null;

  function handlePost(event: FormEvent) {
    event.preventDefault();
    setPosted(false);
    if (!title.trim() || !location.trim() || !description.trim()) {
      setError("Please fill in the title, location and description.");
      return;
    }
    if (!closingDate || new Date(closingDate) <= new Date()) {
      setError("Closing date must be in the future.");
      return;
    }
    const min = salaryMin ? Number(salaryMin) : null;
    const max = salaryMax ? Number(salaryMax) : null;
    if (min !== null && max !== null && max <= min) {
      setError("Maximum salary must be greater than the minimum.");
      return;
    }
    setError(null);
    const body: NewJobListing = {
      title: title.trim(),
      description: description.trim(),
      minimumRequirements: requirements.trim() || "Not specified.",
      location: location.trim(),
      type,
      salaryMin: min,
      salaryMax: max,
      // Send end-of-day UTC so the date the employer picked is always in the future.
      expiresAt: new Date(`${closingDate}T23:59:59Z`).toISOString(),
      minimumExperienceYears: Number(minExp) || 0,
      responsibilities: [],
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    postJob.mutate(body);
  }

  function handleSignOut() {
    logout();
    router.push("/recruiter/signin");
  }

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Employer dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Signed in as {employer.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        {/* Post a new job */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Plus className="h-5 w-5 text-brand-500" /> Post a new job
          </h2>
          <form onSubmit={handlePost} noValidate className="mt-5 space-y-4">
            {(error || postJob.isError) && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                {error ?? (postJob.error as Error)?.message}
              </p>
            )}
            {posted && !postJob.isError && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                Posted! Your role is live on the board now.
              </p>
            )}
            <div>
              <label htmlFor="title" className="block text-sm font-medium">
                Job title
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="location" className="block text-sm font-medium">
                  Location
                </label>
                <input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium">
                  Employment type
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as EmploymentType)}
                  className={inputClass}
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="salaryMin" className="block text-sm font-medium">
                  Salary min{" "}
                  <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="salaryMin"
                  type="number"
                  min={0}
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="salaryMax" className="block text-sm font-medium">
                  Salary max{" "}
                  <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="salaryMax"
                  type="number"
                  min={0}
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="closingDate"
                  className="block text-sm font-medium"
                >
                  Closing date
                </label>
                <input
                  id="closingDate"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="skills" className="block text-sm font-medium">
                  Skills <span className="text-slate-400">(comma separated)</span>
                </label>
                <input
                  id="skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="React, TypeScript, SQL"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="minExp" className="block text-sm font-medium">
                  Minimum experience (years)
                </label>
                <input
                  id="minExp"
                  type="number"
                  min={0}
                  value={minExp}
                  onChange={(e) => setMinExp(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="requirements"
                className="block text-sm font-medium"
              >
                Minimum requirements
              </label>
              <textarea
                id="requirements"
                rows={2}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={postJob.isPending}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133] dark:disabled:bg-slate-600"
            >
              {postJob.isPending ? "Posting…" : "Post job"}
            </button>
          </form>
        </section>

        {/* Jobs already posted */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Jobs you&apos;ve posted ({jobs?.length ?? 0})
          </h2>
          {!jobs || jobs.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-[#1a1133] dark:text-slate-400">
              You haven&apos;t posted any jobs yet. Use the form above to create
              your first listing — it will appear on the public board straight
              away.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {jobs.map((job) => {
                const count = job.applicantCount;
                return (
                  <li
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1133]"
                  >
                    <div>
                      <p className="font-semibold">{job.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {job.location} ·{" "}
                        {JOB_TYPES.find((t) => t.value === job.type)?.label ??
                          job.type}{" "}
                        · {job.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                        <Users className="h-3.5 w-3.5" />
                        {count} {count === 1 ? "applicant" : "applicants"}
                      </span>
                      <Link
                        href={`/recruiter/jobs/${job.id}`}
                        className="rounded-lg border border-brand-500/40 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-500/10 dark:text-brand-300"
                      >
                        Review applicants
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
