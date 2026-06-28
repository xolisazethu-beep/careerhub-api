/**
 * The two CareerHub roles, in a standalone module (Assignment 2.3).
 *
 * This lives apart from `src/auth.ts` ON PURPOSE: the Auth.js module
 * augmentation in `next-auth.d.ts` needs the `Role` type, and `src/auth.ts`
 * depends on those augmented next-auth types — importing `Role` from `@/auth`
 * into the augmentation would form a circular type reference (which makes
 * `token.role` collapse to `{}`). Keeping the type here breaks that cycle.
 */
export type Role = "employer" | "candidate";
