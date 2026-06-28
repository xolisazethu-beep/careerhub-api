# Assignment 2.3 — CareerHub Authentication & Smart State
**Protect the Right Things, Show the Right Things to the Right People**

## Objective
Add authentication to CareerHub using Auth.js v5 with a credentials provider, protect routes by role, and replace URL-coupled filter state with the right tool for each job. Assignment 2.2 made CareerHub fast. This assignment makes it secure and stateful — but only where security and state actually belong.

## Background
CareerHub has two distinct user types: candidates browsing and applying for jobs, and employers managing listings. Right now, the same pages are visible to everyone. A candidate can navigate to `/dashboard` and see every employer's listings. An employer has no identity in the system.

The auth configuration must reflect that candidates and employers have fundamentally different capabilities — protecting routes by role, not just by presence of a session. Use the right state tool and justify why: not "nuqs everywhere" or "Zustand for everything."

---

## Part 1 — Written Decisions (answer in README before coding)

**Q1. Mapping roles to route protection.** List every route (`/jobs`, `/jobs/[id]`, `/dashboard`, `/dashboard/listings`, `/login`); for each: who can access, what happens to the wrong role, and whether handled in middleware or page. Required: explain why redirecting an unauthenticated employer to `/login` and redirecting an authenticated candidate away from `/dashboard` are different problems needing different solutions.

**Q2. Session object design.** What goes on the session vs. deliberately left off; cost of putting too much on the session; what breaks if role is on the JWT but not mapped in the session callback; write the exact three-step relay (authorize → jwt → session).

**Q3. State tool for job filters.** For keyword, location, status (Open/All): pick URL state (nuqs) / useState / Zustand and justify. Address refresh behaviour, URL sharing, and whether the employer dashboard needs these filters. Required: at least one filter uses nuqs; explain what that buys over useState.

**Q4. What the nav bar knows.** Why `await auth()` in `layout.tsx` isn't a perf problem; what to do for session in a deeply nested Client Component; why `useSession()` exists alongside `auth()` and when to use each.

---

## Part 2 — Auth Setup
Credentials provider, JWT strategy, module augmentation.

Mock credentials (hardcoded array in `src/auth.ts` ONLY):

| Username | Password | Role |
|---|---|---|
| employer1 | password123 | employer |
| employer2 | password123 | employer |
| alice | password123 | candidate |
| bob | password123 | candidate |

`authorize` must: find user by username; compare password with strict equality (mock, no bcrypt); return `null` on any mismatch (do not throw); return `{ id, name, role }` on success.

- Install `next-auth@beta`.
- `src/auth.ts`: credentials provider, `session: { strategy: "jwt" }`, `pages: { signIn: "/login" }`, role through jwt + session callbacks.
- `src/app/api/auth/[...nextauth]/route.ts` catch-all handler.
- `AUTH_SECRET` in `.env.local`.
- `SessionProvider` in providers component.
- `src/types/next-auth.d.ts` module augmentation for `role` on Session, User, JWT.
- No `backendToken` — don't add unused fields.

---

## Part 3 — Login Page
`src/app/login/page.tsx` — Server Component. Inline Server Action calls `signIn("credentials", { username, password, redirectTo })`.

Role redirect: employer → `/dashboard/listings`; candidate → `/jobs`.

Challenge: `signIn` runs before the session exists, so role isn't available at redirect time — solve via how Auth.js exposes the `authorize` result through callbacks before the cookie is written.

Requirements: error panel when `searchParams.error === "CredentialsSignin"`; form field named `username` (not email).

---

## Part 4 — Middleware
`src/middleware.ts`. Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `api/auth`.

- `/dashboard` and all under it: require `role === "employer"`. Candidate → `/jobs`. Unauthenticated → `/login`.
- `/jobs/[id]` apply check happens in the page (Part 5), NOT middleware. Do not protect `/jobs/[id]`.
- `/login` while signed in: redirect away. Employer → `/dashboard/listings`; candidate → `/jobs`.
- `/jobs` and `/jobs/[id]` are public — middleware must not redirect them.

---

## Part 5 — Role-Gated UI

**Nav bar:** make `layout.tsx` async, call `await auth()`. Signed out → "Sign In" link. Candidate → "Jobs" link, username + candidate badge, Sign Out. Employer → "Dashboard" link, username + employer badge, Sign Out. Don't show Dashboard to candidates or Jobs to employers. Sign Out Server Action calls `signOut({ redirectTo: "/" })`.

**Job detail apply button** (`/jobs/[id]/page.tsx`): employer (signed in) → "Employers cannot apply for jobs." (no form). Signed out → form visible with "You must be signed in to apply. Sign in here." (links `/login`). Candidate → form normally. Call `await auth()` alongside the job fetch with `Promise.all`. Not middleware — `/jobs/[id]` is public.

**Dashboard close button:** middleware already ensures only employers reach the dashboard, so no extra check needed. State this in README and explain why trusting middleware is correct here.

---

## Part 6 — URL State for Job Filters (nuqs)
Install nuqs; add `NuqsAdapter` to providers. Three filters in the URL:

| Filter | URL param | Type | Default |
|---|---|---|---|
| Keyword | q | string | "" |
| Location | location | string | "" |
| Status | status | "open" \| "all" | "all" |

`src/components/JobFilters.tsx` — Client Component using `useQueryStates` for all three. Text input for keyword; text/select for location (justify); toggle/select for status. Debounce keyword + location (local useState, call nuqs setter after 300ms); status updates immediately.

Server-side filtering: `/jobs/page.tsx` reads `q`, `location`, `status` from `searchParams`, passes to `getJobs()`, filters results inside `getJobs()` before returning. Filtered fetch still uses `next: { tags: ["jobs"] }`. Filtering done in JS after the cached fetch (mock API doesn't filter) — cache stores full unfiltered result, filter after retrieval.

---

## Part 7 — Employer Preference Store (Zustand, no persist)
`src/stores/dashboardStore.ts` — Zustand v5:

| Property | Type | Default | Purpose |
|---|---|---|---|
| view | "table" \| "grid" | "table" | layout mode |
| setView(view) | fn | — | setter |
| showClosedJobs | boolean | true | filter closed listings |
| toggleShowClosedJobs() | fn | — | toggler |

No `persist` middleware. Justify in README: right storage key/type if persisting, and why session-level memory is appropriate here.

`src/components/DashboardToolbar.tsx` — Client Component, reads store with individual selectors (one `useStore` per value, not destructuring). Renders view toggle (Table/Grid) + "Show closed jobs" checkbox.

`ListingsTable.tsx` (async Server Component) can't read a Zustand store — accept `view` and `showClosedJobs` as props; the parent (page or thin Client wrapper) reads the store and passes props down. Explain in README why an async Server Component can't call `useStore` and the prop-passing bridge pattern.

Grid view: cards with job title, company, location, status badge, application count. Reuse the same data — no new fetch.

---

## Gate
`npm run build` must complete with zero TypeScript and ESLint errors. Paste the build output. `npx tsc --noEmit` — zero errors.

## README Updates
The role redirect decision; middleware vs page-level guards (one example each + the general principle); why URL state for filters; why Zustand without persist (+ localStorage vs preferences-API tradeoff); the async Server Component / store boundary.

## Stretch Goals
- **A — Role-based close button without middleware:** read session inside `ListingsTable` via `auth()`, render `CloseJobButton` only if `session?.user.role === "employer"`. Comment that it's defence-in-depth.
- **B — Persistent dashboard preference:** add `persist` to localStorage key `careerhub-dashboard-prefs`; handle hydration mismatch via the `useStore` hydration pattern so the UI doesn't flash. README: explain the hydration mismatch and why it only affects persisted client-side stores.
