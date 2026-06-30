import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How CareerHubX collects, uses and protects the personal information you provide when applying for jobs.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-[70vh] bg-white px-4 py-12 text-slate-900 dark:bg-[#0f0a1e] dark:text-white">
      <article className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-extrabold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          A learning project — this summarises how CareerHubX would handle your data.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">What we collect</h2>
            <p className="mt-2">
              When you apply for a role we collect the personal, contact,
              qualification and job-specific information you enter into the
              application wizard, along with the documents you upload (ID or
              passport, matric results, tertiary qualifications, driver&apos;s
              licence where required, motivation letter and CV).
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">How we use it</h2>
            <p className="mt-2">
              Your information is used solely to process your application and to
              share it with the employer you applied to. We do not sell your data.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your consent</h2>
            <p className="mt-2">
              Before submitting, you confirm your information is accurate, consent
              to us processing it under this policy, and agree to be contacted by
              employers about your application. You can withdraw an application at
              any time.
            </p>
          </section>
        </div>

        <Link
          href="/jobs"
          className="mt-10 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Back to jobs
        </Link>
      </article>
    </main>
  );
}
