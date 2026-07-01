import type { DefaultSession } from "next-auth";
import type { Role } from "@/types/roles";

/**
 * Module augmentation (Assignment 2.3). Auth.js's default `Session`, `User` and
 * `JWT` carry no `role`. We add it on all three so `session.user.role`,
 * `user.role` (in authorize/jwt) and `token.role` are strongly typed end-to-end
 * — and a typo like `session.user.roel` fails to COMPILE.
 */
declare module "next-auth" {
  interface Session {
    /** The raw JWT issued by the real CareerHub backend, for authenticated API calls. */
    accessToken?: string;
    user: {
      role: Role;
      /** The backend user id (applicant or employer GUID). */
      id: string;
      /** Employer's company id; null for candidates. */
      companyId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    companyId: string | null;
    /** The backend JWT, threaded onto the NextAuth token so the session can carry it. */
    accessToken: string;
  }
}

// `next-auth/jwt` only RE-EXPORTS the JWT interface from `@auth/core/jwt`, so
// the callback's `token` is typed by the latter. We augment BOTH: "next-auth/jwt"
// is the documented surface, and "@auth/core/jwt" is where the interface is
// actually declared — augmenting it is what makes `token.role` resolve to `Role`
// (otherwise it falls back to the `Record<string, unknown>` index signature).
declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    id: string;
    companyId: string | null;
    accessToken: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    id: string;
    companyId: string | null;
    accessToken: string;
  }
}
