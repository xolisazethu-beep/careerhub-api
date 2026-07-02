import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import AuthShell from "@/components/AuthShell";
import { Field, PasswordField } from "@/components/AuthFields";

/**
 * /login — the single sign-in, backed by the REAL CareerHub API. A SERVER
 * COMPONENT with an inline Server Action; no client JavaScript runs the sign-in.
 *
 * THE ROLE-REDIRECT PROBLEM: at signIn() time we don't yet know the role (only
 * the backend does, after verifying credentials). Rather than a second lookup we
 * send everyone to `/recruiter` and let the middleware route by role — employers
 * stay; candidates are bounced to `/jobs`. One invisible hop, no role guess.
 *
 * On success, signIn() throws a NEXT_REDIRECT that must propagate. On bad
 * credentials it throws an AuthError, which we turn into ?error=CredentialsSignin.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/recruiter",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=CredentialsSignin");
      }
      // NOT an AuthError → this is the NEXT_REDIRECT signIn throws on success.
      // Re-throw so Next performs the redirect.
      throw err;
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Sign in to your CareerHub account."
      footer={
        <span className="text-slate-500 dark:text-slate-400">
          Demo — seeker: <code className="font-mono">demo.applicant@careerhub.co.za</code> ·
          employer: <code className="font-mono">demo.employer@takealot.co.za</code> —
          password <code className="font-mono">DemoPass123!</code>
        </span>
      }
    >
      <form action={authenticate} className="space-y-4">
        {error === "CredentialsSignin" ? (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            Invalid email or password. Please try again.
          </div>
        ) : null}

        {/* Field / PasswordField are shared client inputs. PasswordField brings
            the built-in show/hide (eye) toggle. They stay uncontrolled here, so
            the surrounding Server Action form still reads them via FormData. */}
        <Field
          id="email"
          name="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
        />

        <PasswordField
          id="password"
          name="password"
          label="Password"
          required
          autoComplete="current-password"
          placeholder="password123"
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Sign in
        </button>
      </form>

      {/* New-user path — the signup form lives at /signup; surface it here so
          people without an account can get to it. */}
      <p className="mt-6 text-center text-sm text-slate-600">
        New to CareerHub?{" "}
        <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>

      <p className="mt-2 text-center text-xs text-slate-400">
        Looking for the public board?{" "}
        <Link href="/jobs" className="font-semibold text-brand-700 hover:underline">
          Browse jobs
        </Link>
      </p>
    </AuthShell>
  );
}
