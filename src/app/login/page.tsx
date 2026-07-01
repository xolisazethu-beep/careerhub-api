import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import AuthShell from "@/components/AuthShell";

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

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="password123"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Sign in
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Looking for the public board?{" "}
        <Link href="/jobs" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
          Browse jobs
        </Link>
      </p>
    </AuthShell>
  );
}
