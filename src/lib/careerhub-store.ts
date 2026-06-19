// =============================================================
// src/lib/careerhub-store.ts
// Small client-side data layer (uses localStorage so everything
// works without a backend). Later you can swap these functions
// for real API / database calls and the rest of the app keeps working.
// =============================================================

import type { JobListing } from "@/types";
import { JOBS as JOB_LISTINGS } from "@/lib/seed-jobs";

export type ApplicationStatus =
  | "Submitted"
  | "Under review"
  | "Interview"
  | "Offer"
  | "Rejected";

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  idNumber: string;
  hasRequiredSkill: boolean;
  cvFileName: string;
  acceptedTerms: boolean;
  status: ApplicationStatus;
  appliedAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  requiredSkill: string;
  description: string;
  postedBy: string;
  postedAt: string;
}

export interface RecruiterSession {
  email: string;
  company: string;
}

const APPS_KEY = "careerhub_applications";
const JOBS_KEY = "careerhub_jobs";
const RECRUITER_KEY = "careerhub_recruiter";

/** Maps the API employment-type enum to the human label the Job shape uses. */
const TYPE_LABEL: Record<JobListing["employmentType"], string> = {
  FullTime: "Full-time",
  PartTime: "Part-time",
  Contract: "Contract",
  Internship: "Internship",
};

/**
 * The built-in home-page listings, projected into the simpler `Job` shape the
 * apply page consumes. Sharing the same ids as the home grid means a "Apply"
 * link from any listing resolves here. These live in code (not localStorage)
 * and are never shown on the recruiter dashboard — that list is
 * recruiter-posted jobs only. `getJobById` falls back to these.
 */
export const SEED_JOBS: Job[] = JOB_LISTINGS.map((job) => ({
  id: job.id,
  title: job.title,
  company: job.company,
  location: job.location,
  type: TYPE_LABEL[job.employmentType],
  requiredSkill: job.skills[0] ?? "the listed skill",
  description: job.description,
  postedBy: "demo",
  postedAt: job.postedAt,
}));

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback; // safe on the server
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Applications ----------
export function getApplications(): Application[] {
  return read<Application[]>(APPS_KEY, []);
}

export function saveApplication(app: Application) {
  const all = getApplications();
  all.unshift(app);
  write(APPS_KEY, all);
}

/** Applications belonging to one person, matched by email (case-insensitive). */
export function getApplicationsByEmail(email: string): Application[] {
  const target = email.trim().toLowerCase();
  return getApplications().filter((a) => a.email.toLowerCase() === target);
}

/**
 * The single most recent application for a person — used to greet a returning
 * user with "your last application". Applications are stored newest-first, so
 * the first match is the latest. Returns null when they have none.
 */
export function getLatestApplication(email: string): Application | null {
  return getApplicationsByEmail(email)[0] ?? null;
}

/**
 * Has this person already applied to a given job? Matched by jobId AND email
 * (case-insensitive), so the same account cannot submit the same role twice.
 * The apply page calls this to block duplicate applications.
 */
export function hasApplied(jobId: string, email: string): boolean {
  const target = email.trim().toLowerCase();
  return getApplications().some(
    (a) => a.jobId === jobId && a.email.toLowerCase() === target,
  );
}

/**
 * Withdraw (delete) one application by its id. We read the full list, drop the
 * matching record, and write the rest back. It is a no-op if the id is not
 * found, so calling it twice is safe. Used by the "Withdraw application" flow
 * on the tracking page.
 */
export function withdrawApplication(id: string): void {
  const remaining = getApplications().filter((a) => a.id !== id);
  write(APPS_KEY, remaining);
}

// ---------- Jobs posted by recruiters ----------
export function getJobs(): Job[] {
  return read<Job[]>(JOBS_KEY, []);
}

export function saveJob(job: Job) {
  const all = getJobs();
  all.unshift(job);
  write(JOBS_KEY, all);
}

/**
 * Resolve a single job by id for the apply page. Recruiter-posted jobs take
 * precedence; we fall back to the built-in demo jobs so the flow is usable
 * out of the box. Returns null when nothing matches.
 */
export function getJobById(id: string): Job | null {
  return (
    getJobs().find((job) => job.id === id) ??
    SEED_JOBS.find((job) => job.id === id) ??
    null
  );
}

/** Demo jobs plus everything a recruiter has posted — handy for listing/links. */
export function getAllJobs(): Job[] {
  return [...getJobs(), ...SEED_JOBS];
}

// ---------- Recruiter auth (DEMO ONLY — not secure) ----------
export function getRecruiter(): RecruiterSession | null {
  return read<RecruiterSession | null>(RECRUITER_KEY, null);
}

export function signInRecruiter(session: RecruiterSession) {
  write(RECRUITER_KEY, session);
}

export function signOutRecruiter() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RECRUITER_KEY);
}

// ---------- Helper ----------
export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}