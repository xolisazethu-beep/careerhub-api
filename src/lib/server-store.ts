// =============================================================
// src/lib/server-store.ts
// SERVER-SIDE data layer — the "database" for Assignment 1.4.
//
// This module runs ONLY inside route handlers (the Node.js runtime), never in
// the browser. It is the single source of truth for:
//   • applications submitted via POST /api/applications
//   • jobs a recruiter posts via POST /api/recruiter/jobs
//
// Persistence is a plain JSON file under `<cwd>/.data/`. A real deployment would
// swap this for Postgres/SQL Server, but the route handlers above it would not
// change — they only ever call these functions. State is cached on `globalThis`
// so Next.js's dev hot-reload (which re-evaluates modules) does not wipe it
// between requests.
// =============================================================

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type {
  RecruiterApplication,
  RecruiterDecisionStatus,
  ApplicationRequest,
} from "@/types";

/**
 * A registered user as the server-side store keeps it. The plaintext password
 * is NEVER stored — only a salted scrypt hash. `id`/`name`/`email` are the safe
 * fields the API echoes back to the client (see `toSafeUser`).
 */
export interface StoredUser {
  id: string;
  name: string;
  /** Stored lower-cased + trimmed so look-ups are case-insensitive. */
  email: string;
  /** `${salt}:${scryptHash}` — see `hashPassword`/`verifyPassword`. */
  passwordHash: string;
  createdAt: string;
}

/** A recruiter-posted job, stored server-side so it shows up on the board. */
export interface RecruiterJob {
  id: string;
  title: string;
  company: string;
  location: string;
  /** Serialised employment-type enum NAME, matching the API contract. */
  type: "FullTime" | "PartTime" | "Contract" | "Internship" | "Learnership";
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  responsibilities: string[];
  skills: string[];
  minimumExperienceYears: number;
  minimumRequirements: string;
  /** The recruiter (email) who owns this listing. */
  postedBy: string;
  createdAt: string;
  expiresAt: string;
}

interface StoreShape {
  applications: RecruiterApplication[];
  jobs: RecruiterJob[];
  users: StoredUser[];
  /**
   * Demand-based lifecycle overrides keyed by job id (Assignment 2.2).
   * Closing a job from the dashboard writes `{ [jobId]: "Closed" }` here so the
   * change persists across requests AND across BOTH job sources (seed + recruiter)
   * without mutating the seed module. GET /api/jobs and GET /api/jobs/[id] read
   * the effective status as `override ?? baseStatus`.
   */
  jobStatus: Record<string, string>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "careerhub-db.json");

// Cache the in-memory copy on globalThis so it survives dev hot-reloads.
const globalForStore = globalThis as unknown as {
  __careerhubStore?: StoreShape;
  __careerhubLoaded?: boolean;
};

async function load(): Promise<StoreShape> {
  if (globalForStore.__careerhubLoaded && globalForStore.__careerhubStore) {
    return globalForStore.__careerhubStore;
  }
  let parsed: StoreShape = {
    applications: [],
    jobs: [],
    users: [],
    jobStatus: {},
  };
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const json = JSON.parse(raw) as Partial<StoreShape>;
    parsed = {
      applications: json.applications ?? [],
      jobs: json.jobs ?? [],
      users: json.users ?? [],
      jobStatus: json.jobStatus ?? {},
    };
  } catch {
    // No file yet (first run) — start empty. Any malformed file resets cleanly.
  }
  globalForStore.__careerhubStore = parsed;
  globalForStore.__careerhubLoaded = true;
  return parsed;
}

async function persist(store: StoreShape): Promise<void> {
  globalForStore.__careerhubStore = store;
  globalForStore.__careerhubLoaded = true;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

// ---------- Applications ----------

/**
 * Persist a freshly submitted application. The route handler hands us the
 * validated request body; we own the server-side fields: a generated `id`, the
 * `submittedAt` timestamp, and the initial `status` of "Submitted".
 */
export async function addApplication(
  body: ApplicationRequest,
): Promise<RecruiterApplication> {
  const store = await load();
  const record: RecruiterApplication = {
    ...body,
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
    status: "Submitted",
  };
  store.applications.unshift(record);
  await persist(store);
  return record;
}

/** Every application, newest first. */
export async function listApplications(): Promise<RecruiterApplication[]> {
  const store = await load();
  return store.applications;
}

/** Applications for one job (recruiter applicant review). */
export async function listApplicationsByJob(
  jobId: string,
): Promise<RecruiterApplication[]> {
  const store = await load();
  return store.applications.filter((a) => a.jobId === jobId);
}

/** How many applications a job has received — used for live applicant counts. */
export async function countApplicationsByJob(jobId: string): Promise<number> {
  const store = await load();
  return store.applications.reduce(
    (n, a) => (a.jobId === jobId ? n + 1 : n),
    0,
  );
}

/**
 * The recruiter's accept/reject (or move-to-review) decision. Returns the
 * updated record, or null when the id is unknown so the route can answer 404.
 */
export async function updateApplicationStatus(
  id: string,
  status: RecruiterDecisionStatus,
): Promise<RecruiterApplication | null> {
  const store = await load();
  const app = store.applications.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  await persist(store);
  return app;
}

// ---------- Recruiter jobs ----------

export async function addJob(
  input: Omit<RecruiterJob, "id" | "createdAt" | "expiresAt"> & {
    expiresAt?: string;
  },
): Promise<RecruiterJob> {
  const store = await load();
  const now = new Date();
  const job: RecruiterJob = {
    ...input,
    id: randomUUID(),
    createdAt: now.toISOString(),
    expiresAt:
      input.expiresAt ??
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  store.jobs.unshift(job);
  await persist(store);
  return job;
}

export async function listJobs(): Promise<RecruiterJob[]> {
  const store = await load();
  return store.jobs;
}

/** Jobs posted by one recruiter (matched by email). */
export async function listJobsByRecruiter(
  email: string,
): Promise<RecruiterJob[]> {
  const store = await load();
  const target = email.trim().toLowerCase();
  return store.jobs.filter((j) => j.postedBy.toLowerCase() === target);
}

export async function getJob(id: string): Promise<RecruiterJob | null> {
  const store = await load();
  return store.jobs.find((j) => j.id === id) ?? null;
}

// ---------- Job lifecycle status (Assignment 2.2) ----------

/**
 * The full set of lifecycle overrides, keyed by job id. GET /api/jobs reads this
 * once and applies `override ?? baseStatus` to every row, so a single map lookup
 * resolves the effective status of both seed and recruiter listings.
 */
export async function getJobStatusOverrides(): Promise<Record<string, string>> {
  const store = await load();
  return store.jobStatus;
}

/** The effective override for one job, or null when none has been set. */
export async function getJobStatusOverride(id: string): Promise<string | null> {
  const store = await load();
  return store.jobStatus[id] ?? null;
}

/**
 * Persist a lifecycle status for one job (e.g. "Closed"). This is what the
 * close-listing Server Action's PATCH writes; because it lives in the persistent
 * store it survives the request and is visible to the very next tagged fetch of
 * /jobs or /dashboard/listings once revalidateTag("jobs") has cleared the cache.
 */
export async function setJobStatus(id: string, status: string): Promise<void> {
  const store = await load();
  store.jobStatus[id] = status;
  await persist(store);
}

// ---------- Users / authentication ----------

/** The fields safe to send to the browser — the password hash is never exposed. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
}

/** Strip the password hash before a user record leaves the server. */
export function toSafeUser(user: StoredUser): SafeUser {
  return { id: user.id, name: user.name, email: user.email };
}

/**
 * Salt + hash a plaintext password with scrypt. The 16-byte random salt is
 * stored alongside the hash as `${salt}:${hash}` so each password has a unique
 * salt and identical passwords never produce identical hashes.
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

/**
 * Constant-time verification of a candidate password against a stored hash.
 * `timingSafeEqual` avoids leaking match progress through response timing.
 */
function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  return keyBuf.length === derived.length && timingSafeEqual(derived, keyBuf);
}

/** Look up a user by email (case-insensitive). */
export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  const store = await load();
  const target = email.trim().toLowerCase();
  return store.users.find((u) => u.email === target) ?? null;
}

/**
 * Register a new user. Returns `null` when the email is already taken so the
 * route can answer 409 without leaking which addresses exist via an exception.
 * The password is hashed before it ever touches disk.
 */
export async function addUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<StoredUser | null> {
  const store = await load();
  const email = input.email.trim().toLowerCase();
  if (store.users.some((u) => u.email === email)) return null;
  const user: StoredUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  await persist(store);
  return user;
}

/**
 * Verify credentials. Returns the user on success, `null` on any failure
 * (unknown email OR wrong password) — the caller deliberately cannot tell the
 * two apart, which is what prevents account-enumeration.
 */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<StoredUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}
