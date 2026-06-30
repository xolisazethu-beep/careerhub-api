// =============================================================
// src/lib/profile-store.ts
// Client-side data layer for the APPLICANT PROFILE and for resumable
// application DRAFTS (localStorage, no backend — same approach as
// careerhub-store.ts so the whole flow works offline).
//
// One profile per signed-in user, keyed by email. It stores everything an
// applicant fills in once — personal details, address, the four qualification
// PDFs (Matric, ID copy, Driver's licence, Tertiary), and a profile photo — so
// that when they apply for a job the form can be PRE-FILLED from here instead of
// starting blank.
//
// Files (photo + PDFs) are kept as base64 data URLs so they survive a reload
// without any server storage. Uploads are size-capped (see MAX_*_BYTES) to stay
// well within the ~5 MB localStorage budget.
// =============================================================

export type Gender = "" | "Male" | "Female" | "Other" | "Prefer not to say";

/** Step 1 — who the applicant is. */
export interface PersonalDetails {
  fullName: string;
  email: string;
  phone: string;
  idNumber: string;
  dateOfBirth: string; // ISO yyyy-mm-dd from <input type="date">
  nationality: string;
  gender: Gender;
}

/** Step 2 — where the applicant lives. */
export interface Address {
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

/** A single uploaded file, stored inline as a base64 data URL. */
export interface UploadedDoc {
  fileName: string;
  /** `data:<mime>;base64,…` — renderable/downloadable without a server. */
  dataUrl: string;
  size: number;
  uploadedAt: string;
}

/** The four qualification documents the applicant attaches (Step 3). */
export type QualificationKey = "matric" | "idCopy" | "license" | "tertiary";

export interface Qualifications {
  matric: UploadedDoc | null;
  idCopy: UploadedDoc | null;
  license: UploadedDoc | null;
  tertiary: UploadedDoc | null;
}

/** Human labels for each qualification slot — single source of truth for the UI. */
export const QUALIFICATION_LABELS: Record<QualificationKey, string> = {
  matric: "Matric certificate",
  idCopy: "ID copy",
  license: "Driver's licence",
  tertiary: "Tertiary qualification",
};

/** Which qualifications are mandatory to count the profile as "complete". */
export const REQUIRED_QUALIFICATIONS: QualificationKey[] = ["matric", "idCopy"];

/**
 * The whole applicant profile. `completedSteps` records which wizard steps the
 * person has finished and `lastStep` is where they were last — together they let
 * a returning user pick up exactly where they stopped.
 */
export interface ApplicantProfile {
  /** Owner key — the signed-in user's email, lower-cased. */
  email: string;
  /** Profile picture as a base64 data URL ("" when none uploaded). */
  photoDataUrl: string;
  personal: PersonalDetails;
  address: Address;
  qualifications: Qualifications;
  /** Indices (0-based) of wizard steps the user has completed. */
  completedSteps: number[];
  /** The step the user was last on, so we can resume there. */
  lastStep: number;
  createdAt: string;
  updatedAt: string;
}

const PROFILE_KEY = "careerhub_profiles";
const DRAFT_KEY = "careerhub_application_drafts";

/** Per-file upload caps. PDFs 4 MB, photo 1.5 MB — base64 adds ~33% overhead. */
export const MAX_PDF_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

// ---------- low-level storage helpers (mirrors careerhub-store) ----------

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
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

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---------- profile factory ----------

/** A blank profile for a brand-new user — every field empty, nothing complete. */
export function emptyProfile(email: string): ApplicantProfile {
  const now = new Date().toISOString();
  return {
    email: normaliseEmail(email),
    photoDataUrl: "",
    personal: {
      fullName: "",
      email,
      phone: "",
      idNumber: "",
      dateOfBirth: "",
      nationality: "South African",
      gender: "",
    },
    address: {
      line1: "",
      line2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "South Africa",
    },
    qualifications: { matric: null, idCopy: null, license: null, tertiary: null },
    completedSteps: [],
    lastStep: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- profile read / write ----------

type ProfileMap = Record<string, ApplicantProfile>;

/** The stored profile for a user, or null when they have never started one. */
export function getProfile(email: string): ApplicantProfile | null {
  if (!email) return null;
  const all = read<ProfileMap>(PROFILE_KEY, {});
  return all[normaliseEmail(email)] ?? null;
}

/** Persist a profile, stamping `updatedAt`. */
export function saveProfile(profile: ApplicantProfile): ApplicantProfile {
  const all = read<ProfileMap>(PROFILE_KEY, {});
  const next: ApplicantProfile = {
    ...profile,
    email: normaliseEmail(profile.email),
    updatedAt: new Date().toISOString(),
  };
  all[next.email] = next;
  write(PROFILE_KEY, all);
  return next;
}

/** Has the user created a profile at all? */
export function hasProfile(email: string): boolean {
  return getProfile(email) !== null;
}

// ---------- completion / progress ----------

export interface ProfileCompletion {
  /** 0–100 overall percentage across the three data steps. */
  percent: number;
  personalDone: boolean;
  addressDone: boolean;
  qualificationsDone: boolean;
  /** True only when every required section is filled in. */
  complete: boolean;
}

/** Derive how far through the profile the user is — drives progress bars + gates. */
export function profileCompletion(
  profile: ApplicantProfile | null,
): ProfileCompletion {
  if (!profile) {
    return {
      percent: 0,
      personalDone: false,
      addressDone: false,
      qualificationsDone: false,
      complete: false,
    };
  }

  const p = profile.personal;
  const personalDone = Boolean(
    p.fullName.trim() && p.email.trim() && p.phone.trim() && p.idNumber.trim(),
  );

  const a = profile.address;
  const addressDone = Boolean(
    a.line1.trim() && a.city.trim() && a.province.trim() && a.postalCode.trim(),
  );

  const qualificationsDone = REQUIRED_QUALIFICATIONS.every(
    (key) => profile.qualifications[key] !== null,
  );

  const done = [personalDone, addressDone, qualificationsDone].filter(
    Boolean,
  ).length;
  const percent = Math.round((done / 3) * 100);

  return {
    percent,
    personalDone,
    addressDone,
    qualificationsDone,
    complete: personalDone && addressDone && qualificationsDone,
  };
}

// ---------- file → data URL ----------

/**
 * Read a File into a base64 data URL, enforcing a type + size cap. Rejects with a
 * human-readable message the form surfaces directly. Used for both the photo
 * (images) and the qualification PDFs.
 */
export function fileToDataUrl(
  file: File,
  opts: { accept: "pdf" | "image"; maxBytes: number },
): Promise<UploadedDoc> {
  return new Promise((resolve, reject) => {
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (opts.accept === "pdf" && !isPdf) {
      reject(new Error("Please upload a PDF file."));
      return;
    }
    if (opts.accept === "image" && !isImage) {
      reject(new Error("Please upload an image file (PNG or JPG)."));
      return;
    }
    if (file.size > opts.maxBytes) {
      const mb = (opts.maxBytes / (1024 * 1024)).toFixed(1);
      reject(new Error(`File is too large — keep it under ${mb} MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () =>
      resolve({
        fileName: file.name,
        dataUrl: String(reader.result),
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    reader.readAsDataURL(file);
  });
}

// =============================================================
// Application DRAFTS — "resume where you stopped".
//
// When a signed-in user starts applying but does not submit, we keep their
// partial answers here, keyed by `${email}::${jobId}`. On their next visit we
// restore the fields and show a banner; on a successful submit we clear it.
// =============================================================

export interface ApplicationDraft {
  jobId: string;
  jobTitle: string;
  company: string;
  /** Owner email, lower-cased. */
  email: string;
  /** Partial form values, restored verbatim into the apply form. */
  values: {
    fullName?: string;
    email?: string;
    phone?: string;
    nationality?: string;
    idNumber?: string;
    hasSkill?: boolean | null;
    cvFileName?: string;
    acceptedTerms?: boolean;
  };
  updatedAt: string;
}

type DraftMap = Record<string, ApplicationDraft>;

function draftId(email: string, jobId: string): string {
  return `${normaliseEmail(email)}::${jobId}`;
}

/** The saved draft for one job + user, or null when none exists. */
export function getDraft(email: string, jobId: string): ApplicationDraft | null {
  if (!email) return null;
  const all = read<DraftMap>(DRAFT_KEY, {});
  return all[draftId(email, jobId)] ?? null;
}

/** Create/update the draft for one job + user. */
export function saveDraft(
  draft: Omit<ApplicationDraft, "updatedAt">,
): ApplicationDraft {
  const all = read<DraftMap>(DRAFT_KEY, {});
  const next: ApplicationDraft = {
    ...draft,
    email: normaliseEmail(draft.email),
    updatedAt: new Date().toISOString(),
  };
  all[draftId(next.email, next.jobId)] = next;
  write(DRAFT_KEY, all);
  return next;
}

/** Drop the draft once the application is submitted (or abandoned). */
export function clearDraft(email: string, jobId: string): void {
  const all = read<DraftMap>(DRAFT_KEY, {});
  delete all[draftId(email, jobId)];
  write(DRAFT_KEY, all);
}

/** Every unfinished draft for a user, newest first — powers the resume banner. */
export function getDraftsByEmail(email: string): ApplicationDraft[] {
  if (!email) return [];
  const target = normaliseEmail(email);
  return Object.values(read<DraftMap>(DRAFT_KEY, {}))
    .filter((d) => d.email === target)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** The single most recent unfinished draft, or null. */
export function getLatestDraft(email: string): ApplicationDraft | null {
  return getDraftsByEmail(email)[0] ?? null;
}
