"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/AuthShell";
import { Field, FormError, SubmitButton } from "@/components/AuthFields";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    // Password reset has no backend endpoint yet. Always show the same neutral
    // confirmation so the page never reveals whether an address is registered.
    setTimeout(() => {
      setSent(true);
      setPending(false);
    }, 400);
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll send a reset link to your email."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-5 text-sm text-brand-800">
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-1 text-brand-700">
            If an account exists for <span className="font-medium">{email}</span>, a password
            reset link is on its way. The link expires in 30 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormError message={error} />
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.co.za"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <SubmitButton pending={pending}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
