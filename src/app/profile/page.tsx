// =============================================================
// src/app/profile/page.tsx
// Applicant profile — a 4-step wizard the user fills in ONCE:
//   0) Personal details (+ profile photo)
//   1) Address
//   2) Qualifications (Matric, ID copy, Driver's licence, Tertiary — PDFs)
//   3) Review & finish
//
// Everything is saved per step to localStorage (profile-store), so a user who
// leaves halfway returns to the exact step they stopped on (`lastStep`). The
// saved profile is what later pre-fills the job application form, so applying
// never starts from a blank page.
// =============================================================
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  User as UserIcon,
  MapPin,
  GraduationCap,
  CheckCircle2,
  Check,
  Camera,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DocUpload from "@/components/profile/DocUpload";
import ResumeBanner from "@/components/profile/ResumeBanner";
import {
  emptyProfile,
  getProfile,
  saveProfile,
  profileCompletion,
  fileToDataUrl,
  MAX_PHOTO_BYTES,
  QUALIFICATION_LABELS,
  REQUIRED_QUALIFICATIONS,
  type ApplicantProfile,
  type PersonalDetails,
  type Address,
  type QualificationKey,
  type UploadedDoc,
} from "@/lib/profile-store";

const STEPS = [
  { label: "Personal", icon: UserIcon },
  { label: "Address", icon: MapPin },
  { label: "Qualifications", icon: GraduationCap },
  { label: "Review", icon: CheckCircle2 },
] as const;

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-[#0f0a1e] dark:text-white dark:placeholder:text-slate-500";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-200";

export default function ProfilePage() {
  const { user, isReady } = useAuth();
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [step, setStep] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);

  // Load (or create) the profile for the signed-in user, and resume on the step
  // they last stopped at.
  useEffect(() => {
    if (!isReady || !user) return;
    const existing = getProfile(user.email);
    if (existing) {
      // Keep name/email aligned with the account in case it changed.
      const synced: ApplicantProfile = {
        ...existing,
        personal: {
          ...existing.personal,
          fullName: existing.personal.fullName || user.name,
          email: existing.personal.email || user.email,
        },
      };
      setProfile(synced);
      setStep(Math.min(synced.lastStep, STEPS.length - 1));
    } else {
      const fresh = emptyProfile(user.email);
      fresh.personal.fullName = user.name;
      setProfile(fresh);
    }
  }, [isReady, user]);

  const completion = useMemo(() => profileCompletion(profile), [profile]);

  // --- field updaters -------------------------------------------------------
  function setPersonal<K extends keyof PersonalDetails>(
    key: K,
    val: PersonalDetails[K],
  ) {
    setProfile((p) => (p ? { ...p, personal: { ...p.personal, [key]: val } } : p));
  }
  function setAddress<K extends keyof Address>(key: K, val: Address[K]) {
    setProfile((p) => (p ? { ...p, address: { ...p.address, [key]: val } } : p));
  }
  function setQualification(key: QualificationKey, doc: UploadedDoc | null) {
    setProfile((p) =>
      p ? { ...p, qualifications: { ...p.qualifications, [key]: doc } } : p,
    );
  }

  // Persist the current state, marking `current` complete and remembering where
  // the user is. Returns the saved snapshot so callers can keep state in sync.
  function persist(current: number, nextStep: number) {
    setProfile((p) => {
      if (!p) return p;
      const completedSteps = Array.from(
        new Set([...p.completedSteps, current]),
      ).sort((a, b) => a - b);
      const saved = saveProfile({ ...p, completedSteps, lastStep: nextStep });
      return saved;
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  }

  function goNext() {
    persist(step, Math.min(step + 1, STEPS.length - 1));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function jumpTo(target: number) {
    // Only allow jumping to a step already reached/completed or the next one.
    if (target <= Math.max(step, ...(profile?.completedSteps ?? [-1]))) {
      persist(step, target);
      setStep(target);
    }
  }

  // --- gates ----------------------------------------------------------------
  if (!isReady) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-white dark:bg-[#0f0a1e]">
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-white px-4 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Sign in to build your profile</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your profile keeps your details and documents in one place so you
            never have to re-type them when you apply.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <div className="mx-auto max-w-3xl">
        <ResumeBanner />

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">My profile</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Fill this in once — we&apos;ll use it to pre-fill every application.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-300">
              {completion.percent}%
            </p>
            <p className="text-xs text-slate-400">complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 transition-all"
            style={{ width: `${completion.percent}%` }}
          />
        </div>

        {/* Stepper */}
        <Stepper
          step={step}
          completedSteps={profile.completedSteps}
          onJump={jumpTo}
        />

        {savedFlash && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" /> Progress saved
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1133]">
          {step === 0 && (
            <PersonalStep
              profile={profile}
              setPersonal={setPersonal}
              onPhoto={(photo) =>
                setProfile((p) => (p ? { ...p, photoDataUrl: photo } : p))
              }
            />
          )}
          {step === 1 && <AddressStep address={profile.address} setAddress={setAddress} />}
          {step === 2 && (
            <QualificationsStep
              qualifications={profile.qualifications}
              setQualification={setQualification}
            />
          )}
          {step === 3 && <ReviewStep profile={profile} completion={completion} onJump={jumpTo} />}

          {/* Nav buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5 dark:border-white/10">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Save &amp; continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/jobs"
                onClick={() => persist(step, step)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Finish &amp; browse jobs
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------- Stepper ----------
function Stepper({
  step,
  completedSteps,
  onJump,
}: {
  step: number;
  completedSteps: number[];
  onJump: (n: number) => void;
}) {
  return (
    <ol className="mt-6 flex items-center">
      {STEPS.map((s, i) => {
        const done = completedSteps.includes(i);
        const active = i === step;
        const isLast = i === STEPS.length - 1;
        const Icon = s.icon;
        return (
          <li key={s.label} className={"flex items-center " + (isLast ? "" : "flex-1")}>
            <button
              type="button"
              onClick={() => onJump(i)}
              className="flex flex-col items-center"
            >
              <span
                className={
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition " +
                  (active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white text-slate-400 dark:border-white/15 dark:bg-[#0f0a1e] dark:text-slate-500")
                }
              >
                {done && !active ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </span>
              <span
                className={
                  "mt-2 w-20 text-center text-[11px] font-medium leading-tight " +
                  (active || done
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500")
                }
              >
                {s.label}
              </span>
            </button>
            {!isLast && (
              <span
                aria-hidden
                className={
                  "mx-1 -mt-6 h-0.5 flex-1 " +
                  (completedSteps.includes(i)
                    ? "bg-emerald-500"
                    : "bg-slate-200 dark:bg-white/15")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Step 0: Personal ----------
function PersonalStep({
  profile,
  setPersonal,
  onPhoto,
}: {
  profile: ApplicantProfile;
  setPersonal: <K extends keyof PersonalDetails>(k: K, v: PersonalDetails[K]) => void;
  onPhoto: (dataUrl: string) => void;
}) {
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const p = profile.personal;

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    try {
      const doc = await fileToDataUrl(file, { accept: "image", maxBytes: MAX_PHOTO_BYTES });
      onPhoto(doc.dataUrl);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Could not load image.");
    } finally {
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-bold">Personal details</h2>

      {/* Profile photo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {profile.photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoDataUrl}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-brand-500/40"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-slate-400 dark:bg-white/10">
              <UserIcon className="h-9 w-9" />
            </span>
          )}
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow hover:bg-brand-700"
            aria-label="Upload photo"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-slate-400">PNG or JPG, up to 1.5 MB.</p>
          {profile.photoDataUrl && (
            <button
              type="button"
              onClick={() => onPhoto("")}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
          {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePhoto(e.target.files?.[0])}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="fullName">Full name</label>
          <input id="fullName" className={inputClass} value={p.fullName}
            onChange={(e) => setPersonal("fullName", e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" type="email" className={inputClass} value={p.email}
            onChange={(e) => setPersonal("email", e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">Phone</label>
          <input id="phone" type="tel" className={inputClass} value={p.phone}
            onChange={(e) => setPersonal("phone", e.target.value)} autoComplete="tel" />
        </div>
        <div>
          <label className={labelClass} htmlFor="idNumber">ID number</label>
          <input id="idNumber" className={inputClass} value={p.idNumber}
            onChange={(e) => setPersonal("idNumber", e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="dateOfBirth">Date of birth</label>
          <input id="dateOfBirth" type="date" className={inputClass} value={p.dateOfBirth}
            onChange={(e) => setPersonal("dateOfBirth", e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="nationality">Nationality</label>
          <input id="nationality" className={inputClass} value={p.nationality}
            onChange={(e) => setPersonal("nationality", e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="gender">Gender</label>
          <select id="gender" className={inputClass} value={p.gender}
            onChange={(e) => setPersonal("gender", e.target.value as PersonalDetails["gender"])}>
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ---------- Step 1: Address ----------
function AddressStep({
  address,
  setAddress,
}: {
  address: Address;
  setAddress: <K extends keyof Address>(k: K, v: Address[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-bold">Address</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="line1">Street address</label>
          <input id="line1" className={inputClass} value={address.line1}
            onChange={(e) => setAddress("line1", e.target.value)} autoComplete="address-line1" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="line2">
            Apartment, suite, etc. <span className="text-slate-400">(optional)</span>
          </label>
          <input id="line2" className={inputClass} value={address.line2}
            onChange={(e) => setAddress("line2", e.target.value)} autoComplete="address-line2" />
        </div>
        <div>
          <label className={labelClass} htmlFor="city">City / town</label>
          <input id="city" className={inputClass} value={address.city}
            onChange={(e) => setAddress("city", e.target.value)} autoComplete="address-level2" />
        </div>
        <div>
          <label className={labelClass} htmlFor="province">Province</label>
          <select id="province" className={inputClass} value={address.province}
            onChange={(e) => setAddress("province", e.target.value)}>
            <option value="">Select a province…</option>
            {SA_PROVINCES.map((pr) => (
              <option key={pr} value={pr}>{pr}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="postalCode">Postal code</label>
          <input id="postalCode" className={inputClass} value={address.postalCode}
            onChange={(e) => setAddress("postalCode", e.target.value)} autoComplete="postal-code" />
        </div>
        <div>
          <label className={labelClass} htmlFor="country">Country</label>
          <input id="country" className={inputClass} value={address.country}
            onChange={(e) => setAddress("country", e.target.value)} autoComplete="country-name" />
        </div>
      </div>
    </div>
  );
}

// ---------- Step 2: Qualifications ----------
function QualificationsStep({
  qualifications,
  setQualification,
}: {
  qualifications: ApplicantProfile["qualifications"];
  setQualification: (k: QualificationKey, doc: UploadedDoc | null) => void;
}) {
  const order: QualificationKey[] = ["matric", "idCopy", "license", "tertiary"];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Qualifications &amp; documents</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload each document as a PDF. These attach automatically to your
          applications.
        </p>
      </div>
      {order.map((key) => (
        <DocUpload
          key={key}
          label={QUALIFICATION_LABELS[key]}
          hint={REQUIRED_QUALIFICATIONS.includes(key) ? "(required)" : "(optional)"}
          value={qualifications[key]}
          onChange={(doc) => setQualification(key, doc)}
        />
      ))}
    </div>
  );
}

// ---------- Step 3: Review ----------
function ReviewStep({
  profile,
  completion,
  onJump,
}: {
  profile: ApplicantProfile;
  completion: ReturnType<typeof profileCompletion>;
  onJump: (n: number) => void;
}) {
  const p = profile.personal;
  const a = profile.address;
  return (
    <div className="space-y-5">
      <h2 className="font-display text-lg font-bold">Review your profile</h2>

      {!completion.complete && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          Some required sections are still incomplete. You can finish now and
          come back any time — your progress is saved.
        </p>
      )}

      <ReviewSection title="Personal details" onEdit={() => onJump(0)}>
        <div className="flex items-center gap-3">
          {profile.photoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoDataUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          )}
          <dl className="grid flex-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Row k="Name" v={p.fullName} />
            <Row k="Email" v={p.email} />
            <Row k="Phone" v={p.phone} />
            <Row k="ID number" v={p.idNumber} />
            <Row k="Date of birth" v={p.dateOfBirth} />
            <Row k="Nationality" v={p.nationality} />
          </dl>
        </div>
      </ReviewSection>

      <ReviewSection title="Address" onEdit={() => onJump(1)}>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Row k="Street" v={[a.line1, a.line2].filter(Boolean).join(", ")} />
          <Row k="City" v={a.city} />
          <Row k="Province" v={a.province} />
          <Row k="Postal code" v={a.postalCode} />
          <Row k="Country" v={a.country} />
        </dl>
      </ReviewSection>

      <ReviewSection title="Qualifications" onEdit={() => onJump(2)}>
        <ul className="space-y-1.5 text-sm">
          {(Object.keys(QUALIFICATION_LABELS) as QualificationKey[]).map((key) => {
            const doc = profile.qualifications[key];
            return (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-300">
                  {QUALIFICATION_LABELS[key]}
                </span>
                {doc ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
                    <Check className="h-4 w-4" />
                    <a href={doc.dataUrl} target="_blank" rel="noopener noreferrer"
                      className="max-w-[12rem] truncate font-medium hover:underline">
                      {doc.fileName}
                    </a>
                  </span>
                ) : (
                  <span className="text-slate-400">Not uploaded</span>
                )}
              </li>
            );
          })}
        </ul>
      </ReviewSection>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <button type="button" onClick={onEdit}
          className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 sm:block">
      <dt className="text-slate-400">{k}</dt>
      <dd className="font-medium text-slate-800 dark:text-slate-100">{v || "—"}</dd>
    </div>
  );
}
