import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Route protection by role and session state (Assignment 2.3, Part 4).
 *
 * Wrapping the middleware in Auth.js's `auth()` gives every request `req.auth`
 * — the decoded JWT session (or null) — WITHOUT a database call, because the
 * session lives in a signed cookie the middleware can read on the edge. We then
 * gate purely on `role` + presence of a session.
 *
 * Why these rules live here and not in the pages: they are coarse, whole-section
 * redirects ("an employer area"), decided before any page code runs, so the
 * candidate never even starts rendering the dashboard. The finer, content-level
 * rule — candidates vs. employers seeing the APPLY FORM on the public, viewable-
 * by-all `/jobs/[id]` — stays in the page (Part 5), which is why `/jobs/[id]` is
 * deliberately NOT matched/redirected here.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const role = session?.user?.role;
  const isLoggedIn = Boolean(session);
  const path = nextUrl.pathname;

  // The employer dashboard lives at /recruiter/*. Its sign-in page must stay
  // reachable while signed out, so it is excluded from the gate.
  const isRecruiter = path === "/recruiter" || path.startsWith("/recruiter/");
  const isRecruiterSignin = path === "/recruiter/signin";
  const isLogin = path === "/login";

  // /recruiter/* — employer-only (except its own sign-in page).
  if (isRecruiter && !isRecruiterSignin) {
    // Unauthenticated: send to the employer sign-in. No identity yet.
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/recruiter/signin", nextUrl));
    }
    // Authenticated but wrong role: bounce to the candidate board (they're
    // already signed in, so /login would be nonsensical).
    if (role !== "employer") {
      return NextResponse.redirect(new URL("/jobs", nextUrl));
    }
  }

  // /login while already signed in — send them to their home surface by role.
  if (isLogin && isLoggedIn) {
    const dest = role === "employer" ? "/recruiter" : "/jobs";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  // /jobs and /jobs/[id] fall through here untouched — they are public.
  return NextResponse.next();
});

export const config = {
  // Run on everything EXCEPT Next internals, the favicon, and Auth.js's own
  // endpoints (which must stay reachable for sign-in/out to work).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
