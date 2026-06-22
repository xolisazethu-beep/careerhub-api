import { NextResponse } from "next/server";
import { authenticateUser, toSafeUser } from "@/lib/server-store";
import type { LoginRequest } from "@/types";

/**
 * Real sign-in against the file-based server store. Credentials are verified
 * with a constant-time scrypt comparison (`authenticateUser`). A wrong email
 * and a wrong password return the SAME 401 so the response can't be used to
 * discover which accounts exist.
 *
 * Runs in the Node.js runtime because the store uses `node:fs`/`node:crypto`.
 */

function problem(title: string, detail: string, status: number) {
  return NextResponse.json({ title, detail, status }, { status });
}

export async function POST(request: Request) {
  let body: Partial<LoginRequest>;
  try {
    body = (await request.json()) as Partial<LoginRequest>;
  } catch {
    return problem(
      "Invalid request body",
      "The request body could not be parsed as JSON.",
      400,
    );
  }

  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return problem(
      "Missing credentials",
      "Both 'email' and 'password' are required.",
      400,
    );
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return problem(
      "Sign-in failed",
      "Email or password is incorrect.",
      401,
    );
  }

  return NextResponse.json({ user: toSafeUser(user) }, { status: 200 });
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
