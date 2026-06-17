// =============================================================
// src/app/recruiter/page.tsx
// Recruiter dashboard. Requires a recruiter session (redirects to
// sign-in otherwise). Lets the recruiter post a job — which makes it
// applyable at /apply/[jobId] — and lists jobs they've already posted.
// =============================================================
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Plus } from "lucide-react";
import {
  getJobs,
  getRecruiter,
  saveJob,
  signOutRecruiter,
  uid,
  type Job,
  type RecruiterSession,
} from "@/lib/careerhub-store";

const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<RecruiterSession | null>(null);
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<(typeof JOB_TYPES)[number]>("Full-time");
  const [requiredSkill, setRequiredSkill] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auth gate. Runs once after mount: if there is no recruiter session we
  // redirect to sign-in; otherwise we load the session and posted jobs.
  useEffect(() => {
    const current = getRecruiter();
    if (!current) {
      router.replace("/recruiter/signin");
      return;
    }
    setSession(current);
    setJobs(getJobs());
    setReady(true);
  }, [router]);

  // Until the gate resolves, render nothing to avoid flashing the dashboard
  // before a possible redirect.
  if (!ready || !session) return null;

  function handlePost(event: FormEvent) {
    event.preventDefault();
    if (
      !title.trim() ||
      !location.trim() ||
      !requiredSkill.trim() ||
      !description.trim()
    ) {
      setError("Please fill in every field.");
      return;
    }
    setError(null);

    const job: Job = {
      id: uid(),
      title: title.trim(),
      company: session!.company,
      location: location.trim(),
      type,
      requiredSkill: requiredSkill.trim(),
      description: description.trim(),
      postedBy: session!.email,
      postedAt: new Date().toISOString(),
    };
    saveJob(job);
    setJobs(getJobs());

    // Reset the form for the next posting.
    setTitle("");
    setLocation("");
    setType("Full-time");
    setRequiredSkill("");
    setDescription("");
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
            <h1 className="text-2xl font-bold sm:text-3xl">
              {session.company}
            </h1>
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
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                {error}
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
                  setType(e.target.value as (typeof JOB_TYPES)[number])
                }
                className={inputClass}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="skill" className="block text-sm font-medium">
                Required skill
              </label>
              <input
                id="skill"
                value={requiredSkill}
                onChange={(e) => setRequiredSkill(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium"
              >
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
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1133]"
            >
              Post job
            </button>
          </form>
        </section>

        {/* Jobs already posted */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Jobs you&apos;ve posted ({jobs.length})
          </h2>
          {jobs.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-[#1a1133] dark:text-slate-400">
              You haven&apos;t posted any jobs yet. Use the form above to create
              your first listing.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1133]"
                >
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {job.location} · {job.type} · {job.requiredSkill}
                    </p>
                  </div>
                  <Link
                    href={`/apply/${job.id}`}
                    className="rounded-lg border border-brand-500/40 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-500/10 dark:text-brand-300"
                  >
                    View apply page
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
