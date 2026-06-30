// =============================================================
// src/app/applications/[id]/confirmation/page.tsx
// Printable confirmation + summary shown after a successful submit.
// Reads the submitted application from the local store by id. Print-friendly
// styles live in globals.css (@media print) — the nav, footer and action
// buttons are hidden when printing so users keep a clean record.
// =============================================================
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Printer, FileText } from "lucide-react";
import { getApplications, type Application } from "@/lib/careerhub-store";
import { Logo } from "@/components/brand/Logo";
import {
  GENDER_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  QUALIFICATIONS,
  DOCUMENT_LABELS,
  type DocumentType,
} from "@/lib/apply-wizard";

export default function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null | undefined>(undefined);

  useEffect(() => {
    setApp(getApplications().find((a) => a.id === id) ?? null);
  }, [id]);

  if (app === undefined) return null; // first client tick

  if (app === null) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-white px-4 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Confirmation not found</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            We couldn&apos;t find that application on this device.
          </p>
          <Link href="/jobs" className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Browse jobs
          </Link>
        </div>
      </main>
    );
  }

  const w = (app.wizard ?? {}) as Record<string, string | number | boolean>;
  const qual = QUALIFICATIONS.find((q) => q.value === w.highestQualification)?.label;

  return (
    <main className="min-h-[70vh] bg-white px-4 py-10 text-slate-900 dark:bg-[#0f0a1e] dark:text-white print:bg-white print:py-0 print:text-black">
      <div className="mx-auto max-w-2xl">
        {/* Print-only letterhead */}
        <div className="mb-6 hidden items-center justify-between print:flex">
          <Logo />
          <span className="text-xs text-slate-500">
            Reference: {app.id.slice(0, 10).toUpperCase()}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-[#1a1133] print:border-0 print:p-0">
          <div className="text-center print:text-left">
            <CheckCircle2 className="mx-auto h-14 w-14 text-brand-500 print:hidden" />
            <h1 className="mt-4 text-2xl font-bold print:mt-0">Application submitted</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Your application for{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{app.jobTitle}</span>{" "}
              at <span className="font-semibold text-slate-900 dark:text-white">{app.company}</span>{" "}
              was received on {new Date(app.appliedAt).toLocaleString()}.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Reference: {app.id.slice(0, 10).toUpperCase()}
            </p>
          </div>

          <Section title="Personal">
            <Row k="Full name" v={app.fullName} />
            <Row k="Gender" v={GENDER_LABELS[w.gender as keyof typeof GENDER_LABELS]} />
            <Row k="Date of birth" v={w.dateOfBirth as string} />
            <Row k="Nationality" v={app.nationality} />
          </Section>

          <Section title="Contact">
            <Row k="Email" v={app.email} />
            <Row k="Phone" v={app.phone} />
            <Row k="Address" v={[w.physicalAddress, w.city, w.province, w.postalCode].filter(Boolean).join(", ")} />
          </Section>

          <Section title="Qualifications & experience">
            <Row k="Highest qualification" v={qual} />
            <Row k="Institution" v={w.institution as string} />
            <Row k="Employment status" v={EMPLOYMENT_STATUS_LABELS[w.employmentStatus as keyof typeof EMPLOYMENT_STATUS_LABELS]} />
            <Row k="Years of experience" v={String(w.yearsOfExperience ?? "")} />
          </Section>

          <Section title="This role">
            <Row k="Expected salary" v={w.expectedSalary ? `R ${Number(w.expectedSalary).toLocaleString()}` : "—"} />
            <Row k="Notice period" v={w.noticePeriod as string} />
            <Row k="Available from" v={w.availableStartDate as string} />
            <Row k="Willing to relocate" v={w.willingToRelocate ? "Yes" : "No"} />
          </Section>

          {app.documents && app.documents.length > 0 && (
            <Section title="Documents">
              <ul className="space-y-1.5 py-1">
                {app.documents.map((d) => (
                  <li key={d.type} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-brand-500" />
                    <span className="font-medium">
                      {DOCUMENT_LABELS[d.type as DocumentType] ?? d.type}
                    </span>
                    <span className="text-slate-400">· {d.fileName}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
            >
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </button>
            <Link href="/applications" className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              Track my applications
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="border-b border-slate-200 pb-1.5 text-sm font-bold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
        {title}
      </h2>
      <dl className="mt-2">{children}</dl>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string | undefined }) {
  const has = v && v.trim().length > 0;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
      <dd className={has ? "max-w-[60%] break-words text-right font-medium" : "italic text-slate-400"}>
        {has ? v : "—"}
      </dd>
    </div>
  );
}
