"use server";

import { signOut } from "@/auth";

/**
 * Sign-out Server Action (Assignment 2.3, Part 5).
 *
 * Used as a <form action={signOutAction}> in the nav. Running on the server lets
 * Auth.js clear the session cookie and issue the redirect in one round-trip —
 * no client fetch, and the nav re-renders signed-out on the next request.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
