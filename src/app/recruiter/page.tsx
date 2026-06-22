// =============================================================
// src/app/recruiter/page.tsx
// Recruiter dashboard. Requires a recruiter session (redirects to
// sign-in otherwise). A recruiter can post a job — which is written to
// the SERVER store (the "database") and immediately appears on the public
// job board — and review every role they've posted with a LIVE applicant
// count, linking through to the applicant-review screen.
// =============================================================
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Plus, Users } from "lucide-react";
import {
  getRecruiter,
  signOutRecruiter,
  type RecruiterSession,
} from "@/lib/careerhub-store";
import {
  fetchRecruiterJobs,
  fetchAllApplications,
  postRecruiterJob,
  type NewRecruiterJob,
} from "@/lib/api";

const JOB_TYPES = [
  { value: "FullTime", label: "Full-time" },
  { value: "PartTime", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Internship", label: "Internship" },
  { value: "Learnership", label: "Learnership" },
] as const;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<RecruiterSession | null>(null);
  const [ready, setReady] = useState(false);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] =
    useState<(typeof JOB_TYPES)[number]["value"]>("FullTime");
  const [skills, setSkills] = useState("");
  const [minExp, setMinExp] = useState("0");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auth gate. Runs once after mount: redirect to sign-in if no session.
  useEffect(() => {
    const current = getRecruiter();
    if (!current) {
      router.replace("/recruiter/signin");
      return;
    }
    setSession(current);
    setReady(true);
  }, [router]);

  // This recruiter's postings, read from the server store.
  const { data: jobs } = useQuery({
    queryKey: ["recruiter-jobs", session?.email],
    queryFn: () => fetchRecruiterJobs(session!.email),
    enabled: !!session,
  });

  // All applications, so we can show a live applicant count per job.
  const { data: applications } = useQuery({
    queryKey: ["all-applications"],
    queryFn: fetchAllApplications,
    enabled: !!session,
  });

  const countByJob = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of applications ?? []) {
      map.set(a.jobId, (map.get(a.jobId) ?? 0) + 1);
    }
    return map;
  }, [applications]);

  const postJob = useMutation({
    mutationFn: postRecruiterJob,
    onSuccess: () => {
      // Refresh the recruiter's list AND the public board so the new job shows
      // up everywhere immediately.
      queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setTitle("");
      setLocation("");
      setType("FullTime");
      setSkills("");
      setMinExp("0");
      setDescription("");
      setRequirements("");
    },
  });

  if (!ready || !session) return null;

  function handlePost(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !location.trim() || !description.trim()) {
      setError("Please fill in the title, location and description.");
      return;
    }
    setError(null);
    const input: NewRecruiterJob = {
      title: title.trim(),
      company: session!.company,
      location: location.trim(),
      type,
      salaryMin: null,
      salaryMax: null,
      description: description.trim(),
      responsibilities: [],
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      minimumExperienceYears: Number(minExp) || 0,
      minimumRequirements: requirements.trim(),
      postedBy: session!.email,
    };
    postJob.mutate(input);
  }

  function handleSignOut() {
    signOutRecruiter();
    router.push("/recruiter/signin");
  }

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{session.company}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Signed in as {session.email}
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
                  onChange={(e) =>
                    setType(
                      e.target.value as (typeof JOB_TYPES)[number]["value"],
                    )
                  }
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
                const count = countByJob.get(job.id) ?? 0;
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
                          job.type}
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
