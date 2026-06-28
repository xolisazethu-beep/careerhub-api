import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@/types/roles";

export type { Role };

/**
 * Assignment 2.3 — MOCK, FRONTEND-ONLY authentication (Auth.js v5).
 *
 * There is no backend auth endpoint. The only users that exist are the four
 * hardcoded here — this array is the SINGLE source of truth for both `authorize`
 * (who can sign in) and the login page's role-based redirect (where they land).
 * Nothing about auth talks to the job API; the backend's only job is job data.
 */

export interface MockUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: Role;
}

/** The complete set of accounts. Username + password are checked literally. */
export const USERS: readonly MockUser[] = [
  { id: "1", username: "employer1", password: "password123", name: "Employer One", role: "employer" },
  { id: "2", username: "employer2", password: "password123", name: "Employer Two", role: "employer" },
  { id: "3", username: "alice", password: "password123", name: "Alice", role: "candidate" },
  { id: "4", username: "bob", password: "password123", name: "Bob", role: "candidate" },
] as const;

/** Look up the role for a username — used by the login page to pick the redirect. */
export function roleForUsername(username: string): Role | undefined {
  return USERS.find((u) => u.username === username)?.role;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions — no database, the session lives entirely in a signed cookie.
  session: { strategy: "jwt" },
  // Our own login route; Auth.js redirects here when a page calls signIn().
  pages: { signIn: "/login" },
  // Trust the local host header in dev/preview (no deployment URL configured).
  trustHost: true,
  providers: [
    Credentials({
      // These names define the credential fields; the login form posts `username`.
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // Strict, literal check against the hardcoded users. Returns null on any
      // mismatch (NEVER throws — a thrown error would surface as a 500, not a
      // clean "invalid credentials"). On success returns the safe identity fields.
      authorize: (credentials) => {
        const username = String(credentials?.username ?? "");
        const password = String(credentials?.password ?? "");
        const user = USERS.find((u) => u.username === username);
        if (!user || user.password !== password) return null;
        return { id: user.id, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    // Persist the role on the token at sign-in so every later request has it
    // without another lookup.
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    // Expose the role on the session so Server Components / middleware can gate UI.
    session({ session, token }) {
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});
