import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, roleForUsername } from "@/auth";
import AuthShell from "@/components/AuthShell";

/**
 * /login — Assignment 2.3, Part 3. A SERVER COMPONENT with an inline Server
 * Action; no client JavaScript runs the sign-in.
 *
 * THE ROLE-REDIRECT PROBLEM: at signIn() time the JWT/session doesn't exist yet,
 * so we can't read the role from the session to decide where to send the user.
 * We solve it by deriving the destination from the USERNAME — the same source of
 * truth `authorize` uses — BEFORE calling signIn, and passing it as `redirectTo`.
 *
 * On a successful sign-in, signIn() throws a NEXT_REDIRECT that must propagate.
 * On bad credentials it throws an AuthError, which we catch and turn into
 * /login?error=CredentialsSignin. Any other error is re-thrown so the success
 * redirect is never swallowed.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    // Destination decided from the username (same data as authorize), so the
    // employer lands on the dashboard and the candidate on the board.
    const redirectTo =
      roleForUsername(username) === "employer" ? "/dashboard/listings" : "/jobs";

    try {
      await signIn("credentials", { username, password, redirectTo });
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
      subtitle="Use a demo account to continue."
      footer={
        <span className="text-slate-500 dark:text-slate-400">
          Demo accounts: <code className="font-mono">employer1</code> /{" "}
          <code className="font-mono">alice</code> — password{" "}
          <code className="font-mono">password123</code>
        </span>
      }
    >
      <form action={authenticate} className="space-y-4">
        {error === "CredentialsSignin" ? (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            Invalid username or password. Please try again.
          </div>
        ) : null}

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            autoFocus
            placeholder="employer1"
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
