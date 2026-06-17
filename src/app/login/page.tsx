"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/AuthShell";
import { Field, FormError, SubmitButton } from "@/components/AuthFields";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
      notify("Welcome back!", "success");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back — pick up where you left off."
      footer={
        <>
          New to CareerHub?{" "}
          <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
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
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
