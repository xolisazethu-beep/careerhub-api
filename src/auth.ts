import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@/types/roles";

export type { Role };

/**
 * REAL, backend-backed authentication (Auth.js v5).
 *
 * This is the single sign-in for the whole app. The Credentials provider verifies
 * the email + password against the real CareerHub API (`POST /api/v1/auth/login`)
 * and, on success, threads the backend's JWT, role, company id and display name
 * onto the Auth.js session. Everything downstream reads ONE session:
 *   • middleware gates routes on `session.user.role` (from the signed cookie),
 *   • client API calls read `session.accessToken` for the Authorization header.
 *
 * The backend's roles ("Applicant"/"Employer") are mapped to the app's
 * ("candidate"/"employer") so the existing role checks and UI keep working.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5080";

/** The shape `POST /api/v1/auth/login` returns. */
interface BackendAuth {
  token: string;
  userId: string;
  email: string;
  role: "Applicant" | "Employer";
  companyId: string | null;
  fullName: string;
}

function toRole(backendRole: string): Role {
  return backendRole === "Employer" ? "employer" : "candidate";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions — no database; the session (incl. the backend token) lives in a
  // signed cookie the middleware can read on the edge without a round-trip.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Verify against the REAL backend. Returns null on any failure (which
      // surfaces as a clean "invalid credentials", never a 500). On success the
      // returned object becomes `user` in the jwt callback below.
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        try {
          const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) return null;

          const data = (await res.json()) as BackendAuth;
          return {
            id: data.userId,
            name: data.fullName,
            email: data.email,
            role: toRole(data.role),
            companyId: data.companyId ?? null,
            accessToken: data.token,
          };
        } catch {
          // Network/backend down → treat as a failed sign-in rather than crashing.
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // Persist the backend identity + token on the Auth.js token at sign-in, so
    // every later request has them without another backend call.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id ?? "";
        token.companyId = user.companyId;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    // Expose them on the session for Server Components, middleware and the client.
    session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      session.user.companyId = token.companyId;
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
