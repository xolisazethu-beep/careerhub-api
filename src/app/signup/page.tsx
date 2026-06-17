"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/AuthShell";
import { Field, FormError, SubmitButton } from "@/components/AuthFields";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function SignupPage() {
  const { signUp } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      await signUp(name, email, password);
      notify("Account created — you're all set!", "success");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes less than a minute to get started."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field
          id="name"
          label="Full name"
          type="text"
          autoComplete="name"
          required
          placeholder="Thandi Mokoena"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
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
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Field
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
