import { NextResponse } from "next/server";
import { addUser, toSafeUser } from "@/lib/server-store";
import type { SignupRequest } from "@/types";

/**
 * Real account creation, persisted to the file-based server store (the same
 * "database" the job/application routes use). Replaces the old localStorage
 * mock: accounts now live server-side and survive page reloads and other
 * browsers. Passwords are hashed before they ever touch disk (see
 * `addUser` → `hashPassword`).
 *
 * Runs in the Node.js runtime because the store uses `node:fs`/`node:crypto`.
 */

/** Problem Details (RFC 9457) — the same error shape the rest of the API uses. */
function problem(title: string, detail: string, status: number) {
  return NextResponse.json({ title, detail, status }, { status });
}

export async function POST(request: Request) {
  let body: Partial<SignupRequest>;
  try {
    body = (await request.json()) as Partial<SignupRequest>;
  } catch {
    return problem(
      "Invalid request body",
      "The request body could not be parsed as JSON.",
      400,
    );
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const password = body.password;

  if (!name || !email || !password) {
    return problem(
      "Missing required fields",
      "'name', 'email' and 'password' are all required.",
      400,
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return problem("Invalid email", "Please provide a valid email address.", 400);
  }
  if (password.length < 8) {
    return problem(
      "Weak password",
      "Password must be at least 8 characters.",
      400,
    );
  }

  const user = await addUser({ name, email, password });
  if (!user) {
    return problem(
      "Email already registered",
      "An account with this email already exists.",
      409,
    );
  }

  return NextResponse.json({ user: toSafeUser(user) }, { status: 201 });
}

export async function GET() {
  return NextResponse.json(
    {
      title: "Method Not Allowed",
      detail: "This endpoint only accepts POST requests.",
      status: 405,
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}
