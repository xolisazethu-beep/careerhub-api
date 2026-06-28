# CareerHub — Assignment 2.3

**Authentication & Smart State — Protect the Right Things, Show the Right Things to the Right People**

CareerHub now has identity. Auth.js v5 (credentials + JWT) gives candidates and
employers distinct roles; middleware protects employer routes; role-gated UI shows
each user only what is theirs; and filter/preference state is moved to the *right*
tool for each job — URL state (nuqs) for shareable job filters, an in-memory
Zustand store for the dashboard's view preference.

> Built directly on Assignment 2.2 (Advanced Data Fetching). The 2.2 write-up is
> preserved further down, under **“Assignment 2.2 (previous).”**

## Mock accounts (all password `password123`)

| Username | Role | Lands on |
|---|---|---|
| `employer1`, `employer2` | employer | `/dashboard/listings` |
| `alice`, `bob` | candidate | `/jobs` |

Sign in at **`/login`**. The accounts are the single source of truth in
`src/auth.ts` — there is no backend auth endpoint.

---

## Part 1 — Written Decisions

### Q1. CareerHub roles → route protection rules

| Route | Who can access | Wrong/again role → | Enforced in |
|---|---|---|---|
| `/jobs` | Everyone (public) | n/a — never redirected | — |
| `/jobs/[id]` | Everyone (public) — employers may *view* | n/a for the page; only the **apply form** is gated | **page** |
| `/dashboard` + `/dashboard/listings` | employer only | unauth → `/login`; candidate → `/jobs` | **middleware** |
| `/login` | signed-out users | already signed in → employer `/dashboard/listings`, candidate `/jobs` | **middleware** |

Everything that is a *whole-section, identity-level* decision lives in middleware
(it runs before any page code, so a candidate never even starts rendering the
dashboard). The one access rule handled in the **page** is the apply form on
`/jobs/[id]`: the route itself is public (an employer is *allowed* to read a job
posting), so there is nothing to redirect — the rule is "which **part** of this
page renders," which only the page knows. Putting it in middleware would wrongly
block employers from *viewing* the listing.

**Why “unauthenticated employer → /login” and “authenticated candidate → not
/dashboard” are different problems.** The first is an **authentication** failure:
*we don't know who you are*, and the only thing that can fix it is signing in, so
the correct destination is `/login`. The second is an **authorization** failure:
*we know exactly who you are — you're just not allowed here.* Sending a signed-in
candidate to `/login` would be absurd (they're already authenticated) and would
loop, since the `/login`-while-signed-in rule would bounce them right back. So
they go to their own home surface, `/jobs`. Same redirect mechanism, opposite
cause: missing identity vs. insufficient permission.

### Q2. The session object design

- **On the session:** `id`, `name`, and **`role`** — the minimum needed to render
  role-gated UI and gate routes. **Deliberately left off:** the password (never
  leaves the `USERS` array), and there is **no `backendToken`** — this is a mock
  with no backend to call, so adding one would be dead weight the assignment
  explicitly warns against.
- **Cost of putting too much on the session:** the JWT session is a **signed
  cookie sent on every request**. Everything you add inflates that cookie (header
  bloat on all traffic), it is only as fresh as the last sign-in (stale the moment
  the underlying data changes), and anything sensitive is now sitting in the
  browser. Keep it to a stable identity + role.
- **What breaks if role is on the JWT but not mapped in the `session` callback:**
  `token.role` exists server-side, but `session.user.role` is `undefined`
  everywhere `auth()`/`useSession()` is read. The nav can't tell employer from
  candidate, the apply gate treats everyone as a candidate, and any
  `role === "employer"` check silently fails. The token having it is invisible
  until the **session callback copies it across**.
- **The three-step relay (this implementation):**
  1. **`authorize`** returns `{ id, name, role }` after matching a `USERS` entry.
  2. **`jwt({ token, user })`** — on sign-in `user` is present, so
     `token.role = user.role` persists the role into the signed token.
  3. **`session({ session, token })`** — copies `session.user.role = token.role`
     so every `auth()`/`useSession()` caller sees it.

### Q3. State tool for the job filters

| Filter | Tool | Why |
|---|---|---|
| Keyword `q` | **nuqs (URL)** | A filtered search is something you *share and bookmark*. In the URL it survives refresh, is shareable, and works with back/forward. |
| Location | **nuqs (URL)** | Same as keyword — part of the same shareable "what am I looking at" state. |
| Status (Open/All) | **nuqs (URL)** | A discrete, shareable view facet; belongs with the other two so one link reproduces the exact result set. |

- **On refresh:** all three persist — they live in the URL, which the page reads
  back via `searchParams`. `useState` would reset to defaults.
- **On sharing the URL:** the recipient sees the **identical filtered view**,
  because the server re-derives results from the same `searchParams`.
- **Does the employer dashboard need these filters?** No. The candidate board's
  search is irrelevant to the employer's listings view — which is exactly why the
  dashboard's *own* preference (table/grid) is **Zustand**, not URL state (Part 7).
- **What nuqs buys over `useState`:** `useState` is component-local and dies on
  reload — it can't be shared, bookmarked, or restored by the back button, and the
  **Server Component can't read it** to filter on the server. nuqs makes the URL
  the single source of truth that both the client inputs *and* the server page
  read.

### Q4. What the nav bar knows

- **Why `await auth()` in `layout.tsx` isn't a perf problem:** `auth()` only
  **verifies and decodes the signed session cookie** — no database round-trip
  (JWT strategy). The layout already renders on the server, so reading the cookie
  it was sent is effectively free, even though it runs on every navigation.
- **Session in a deeply nested Client Component:** don't prop-drill — wrap the
  tree in `<SessionProvider>` (done in `providers.tsx`) and call **`useSession()`**
  in the nested client component.
- **Why `useSession()` exists alongside `auth()`:** `auth()` is the **server**
  accessor (Server Components, route handlers, middleware) — synchronous-feeling,
  no provider needed. `useSession()` is the **client** hook — it needs the
  provider and gives reactive updates in the browser. Reach for `auth()` whenever
  you're already on the server (it's cheaper and avoids shipping the check to the
  client); reach for `useSession()` only inside a Client Component that genuinely
  needs the session at runtime.

---

## README Updates

### The role-redirect decision

The post-login destination is **role-based** because the two roles have different
home surfaces: an employer wants `/dashboard/listings`, a candidate wants `/jobs`.
Sending both to one place would dump a candidate on a page middleware immediately
bounces them off of.

**The problem:** `signIn()` is called inside the login page's Server Action
*before the session cookie exists*, so the role isn't readable from `auth()` at
the moment we must choose `redirectTo`. **The fix:** the role isn't only on the
session — it's derivable from the **username**, which we already have in the form
data and which is the *same source `authorize` uses*. So `roleForUsername(username)`
picks the destination, passed as `signIn(..., { redirectTo })`. Auth.js validates
credentials and, on success, redirects to that URL as it writes the cookie — no
need to wait for a session that doesn't exist yet.

### Middleware vs. page-level guards

- **In middleware:** `/dashboard/*` requires `role === "employer"`. It's a
  coarse, whole-section, identity-level rule that should be decided *before* any
  dashboard code runs — so a candidate is redirected without the page ever
  rendering.
- **In the page:** the apply-form gate on `/jobs/[id]`. The route is **public**
  (employers can view a posting), so there's nothing to redirect; the decision is
  *which part of the page renders* for whom, which only the page can express.
- **The principle:** **redirect-or-not, whole-route, decided before render →
  middleware. What-content-renders, within an allowed page → the page.** If the
  answer is "send them somewhere else," it's middleware; if it's "show them a
  different thing here," it's the page.

### The dashboard close button (trusting middleware)

`CloseJobButton` is rendered with **no role check of its own**. That is correct:
middleware guarantees only `role === "employer"` can reach any `/dashboard/*`
route at all, so by the time `ListingsView` renders, the viewer is provably an
employer. Re-checking would be redundant. (Stretch A adds an `auth()` check inside
the component as *defence-in-depth* — for the hypothetical where the table is
reused on a public page — but that is a second layer, not the primary guard.)

### Why URL state (nuqs) for job filters

Filters describe "what set of jobs am I looking at" — inherently **shareable**
state. In the URL: pasting `/jobs?q=engineer&status=open` to a colleague shows
them the same results; **back/forward** moves between filter states like real
history; a **bookmark** of a filtered search reopens exactly that search. `useState`
gives none of this (lost on reload, invisible to the server) and Zustand, while it
survives navigation, still isn't in the URL — so it can't be shared or bookmarked.

### Why Zustand *without* persist for the dashboard view

The table/grid + show-closed preference is **session-level UI state**: it should
follow the employer across in-app navigation (Zustand is a module singleton, so it
does) but **reset on a full refresh** to the sensible default. It isn't user data
and the server never needs it, so URL state would be wrong (it'd pollute shareable
links) and a backend write would be overkill.

**If it had to persist:** `persist(..., { name: "careerhub-dashboard-prefs" })`
to `localStorage` (Stretch B) — the right key/type for a device-local preference.
The tradeoff: **`localStorage`** is zero-infra and instant but per-device/per-
browser and invisible to the server (and needs hydration-mismatch handling); a
**user-preferences API endpoint** follows the user across devices and is
server-readable, at the cost of a network round-trip, auth, and backend work.
For a throwaway view toggle, `localStorage`; for "remember my settings
everywhere," the API.

### The async Server Component / store boundary

`ListingsTable` is an **async Server Component** — it `await`s its data on the
server. It therefore **cannot call `useStore`**: Zustand's hook (like all React
hooks) runs only in Client Components and relies on a client-side subscription the
server doesn't have. The bridge: **the server fetches, the client presents.**
`ListingsTable` does the `Promise.all` fetch + join, then passes the plain `jobs`
and `counts` as props to **`ListingsView`** (`"use client"`), which reads the
Zustand store (`view`, `showClosedJobs`) with one selector per value and renders
table or grid. `DashboardToolbar` writes the same module-singleton store, so
toggling it re-renders `ListingsView` instantly — no refetch, no prop-drilling
through the server.

---

## Gate — build output

`npx tsc --noEmit` exits **0**. `npm run build` completes with **zero TypeScript
and zero ESLint errors**, and emits the role-protection **Middleware**:

```text
 ✓ Compiled successfully in 101s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (23/23)
   Finalizing page optimization ...

Route (app)                                 Size  First Load JS
├ ƒ /api/auth/[...nextauth]                161 B         103 kB
├ ƒ /dashboard/listings                  3.65 kB         109 kB
├ ƒ /jobs                                1.59 kB         113 kB
├ ƒ /jobs/[id]                            2.8 kB         111 kB
├ ƒ /login                                 165 B         106 kB
…
ƒ Middleware                             87.5 kB

ƒ  (Dynamic)  server-rendered on demand
```

Every route is now `ƒ` (dynamic): `await auth()` in the root layout and the
middleware make rendering session-dependent, which is correct for an app that
shows different things to different roles.

### Manual verification checklist

| Check | Result |
|---|---|
| `/login` as `employer1` → `/dashboard/listings` | ✓ |
| `/login` as `alice` → `/jobs` | ✓ |
| Wrong credentials → error panel, form intact | ✓ |
| `/dashboard/listings` signed-out → `/login` | ✓ |
| `/dashboard/listings` as `alice` → `/jobs` | ✓ |
| `/login` while signed in → role home | ✓ |
| Nav shows Dashboard (employer) / Jobs (candidate) + badge + Sign Out | ✓ |
| `/jobs/[id]` as employer → "Employers cannot apply" | ✓ |
| `/jobs/[id]` signed-out → form + sign-in note | ✓ |
| `/jobs/[id]` as candidate → form normal | ✓ |
| `/jobs?q=…` / `?status=open` filter results; URL updates; persists on refresh | ✓ |
| Keyword/location debounced (no nav per keystroke) | ✓ |
| Dashboard toolbar toggles table/grid; survives navigation; resets on refresh | ✓ |
| "Show closed jobs" hides/shows closed listings in both views | ✓ |

---

# Assignment 2.2 (previous) — Advanced Data Fetching

**Advanced Data Fetching — Cache Smarter, Stream Earlier, Mutate on the Server**

CareerHub is a job-listings app built with **Next.js 15.5 (App Router)**, **React 19**,
**TypeScript (strict)** and **Tailwind CSS v4**.

Assignment 2.1 gave every section its own URL, with every server fetch on `cache: "no-store"` —
always fresh, but a round-trip every time. Assignment 2.2 makes those URLs **performant,
progressive and correctly invalidating**:

- **Cache tags** with demand-based invalidation (`next: { tags: ["jobs"] }` instead of no-store)
- **Parallel fetching** of two data sources with `Promise.all`
- **Two independent Suspense boundaries** that stream separately on one page
- A **Server Action** that mutates data and triggers **cross-route** cache revalidation
  (`revalidateTag("jobs")` fired from `/dashboard` invalidates the candidate `/jobs` board)

> A full illustrated, part-by-part walkthrough (code, key lines, UI effect) is in
> **`docs/assignment-2.2/CareerHub-2.2-Walkthrough.html`** — open it in a browser and
> **Print → Save as PDF** for the PDF.

---

## How to run this project

### Prerequisites
- **Node 18.18+** (developed on Node 22)
- npm

### 1. Install
```bash
npm install
```

### 2. Environment
Copy the example file to `.env.local`:
```bash
cp .env.example .env.local
```
It contains the only variable Assignment 2.2 needs:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```
This is the app's own origin, so Server Components can fetch this app's API routes
(`src/app/api/*`). No external/Docker backend is required — jobs, applications, stats and the close
action all run against the in-app API.

### 3. Development
```bash
npm run dev      # http://localhost:3000
```
> **Note:** `npm run dev` deliberately **bypasses** the Next.js Data Cache so the feedback loop
> stays fast. The cache-tag behaviour in Part 3 (no repeat fetch on refresh) is only observable in
> a **production** build — use the commands below for that.

### 4. Production (required to see caching + revalidation)
```bash
npm run build    # must be clean — see "Build gate" below
npm start        # serve the production build at http://localhost:3000
```

### 5. Try the assignment flows
1. **Caching** — open `/jobs`, refresh 2–3×. The first load hits the API once; refreshes serve
   from the Data Cache (no repeat outbound fetch). Same on `/jobs/[id]`.
2. **Streaming** — open DevTools → Network → throttle to *Slow 3G* → open `/dashboard/listings`.
   The heading appears first, then **two** skeletons, then the stat card resolves **before** the
   table (two distinct events).
3. **Apply** — sign in at `/login` (create an account at `/signup`), open a job, apply. The
   dashboard's **Total Applications** rises.
4. **Close + cross-route revalidation** — on `/dashboard/listings` click **Close listing** on an
   open job. Then open `/jobs`: that job now shows **Closed**, and its `/jobs/[id]` page shows the
   "no longer accepting applications" message instead of the apply form.

---

## What was built (Parts 2–6)

| Part | What it adds | Key files |
|---|---|---|
| **2** | In-app endpoints: application **stats** (GET array / POST 405) and a job **PATCH** to close a listing (404 unknown id, 400 missing status, 200 + updated job) | `src/app/api/applications/stats/route.ts`, `src/app/api/jobs/[id]/route.ts`, `src/lib/server-store.ts` |
| **3** | Jobs reads cached + tagged `"jobs"` (detail also `job-${id}` — Stretch B); stats stay `no-store` | `src/app/jobs/(board)/page.tsx`, `src/app/jobs/[id]/page.tsx`, `src/components/ListingsTable.tsx` |
| **4** | Jobs + stats fetched **in parallel** with `Promise.all`, joined into an **Applications** column | `src/components/ListingsTable.tsx` |
| **5** | Page renders heading instantly, then **two independent Suspense boundaries** stream separately | `src/app/dashboard/listings/page.tsx`, `src/components/ApplicationsSummary.tsx`, `src/components/ListingsTable.tsx` |
| **6** | **Server Action** closes a job and fires `revalidateTag("jobs")`; client button uses `useActionState` | `src/app/actions/closeJob.ts`, `src/components/CloseJobButton.tsx` |

### Architecture note — why everything runs on the in-app API
The job board, detail, dashboard, **apply**, **stats** and **close** all read from **this app's own
API** (`src/app/api/*`), backed by the persistent file store `.data/careerhub-db.json` plus the
seed board. Two reasons:

1. **The close-loop is only demonstrable in one server.** `revalidateTag("jobs")` clears Next.js's
   *own* server-side Data Cache. For closing a job on `/dashboard` to visibly invalidate `/jobs`,
   both must read the store the PATCH mutates.
2. **It is self-contained.** No external backend has to be awake, which is what previously made the
   job-detail/apply pages crash on a cold start.

---

## Part 1 — Written Decisions

### 1. Choosing a cache strategy per data source

| Data source | Strategy | Why |
|---|---|---|
| **Jobs list** (`/jobs`, `/dashboard/listings`) | `cache: "force-cache", next: { tags: ["jobs"] }` | Job data only changes on a discrete employer action (publish / close). Between those events every request can be served from the Data Cache. The `"jobs"` tag is the handle `revalidateTag` clears the instant a job is closed. |
| **Single job detail** (`/jobs/[id]`) | `cache: "force-cache", next: { tags: ["jobs", `job-${id}`] }` | Same change profile as the list. The extra per-job tag (Stretch B) lets us refresh *one* detail page without touching the others. |
| **Application statistics** (`/api/applications/stats`) | `cache: "no-store"` | Applications are submitted by candidates at *any* time with **no employer action that can cleanly trigger invalidation**. There is no event to hang a `revalidateTag` on, so always-fresh is the only correct choice. |

> Next 15 leaves `fetch` **uncached by default**, so the jobs fetches add `cache: "force-cache"`
> alongside the tag — the tag only governs data that is actually cached.

**Why stats differ from listings:** listings change on a *known, discrete* trigger (a close), so
they can be cached and explicitly invalidated. Stats change *continuously and silently* with no
trigger — caching them would show stale counts with no mechanism to ever correct them.

**Why two route files sharing one `"jobs"` tag is correct, not a bug:** a tag is not "owned" by a
file — it is a label on a *cached response*. `/jobs/page.tsx` and the dashboard's `ListingsTable`
both fetch jobs and both label their responses `"jobs"`. That is exactly what we want: when an
employer closes a listing, *both* the candidate board and the employer table must update. One
`revalidateTag("jobs")` clears both because they share the label.

### 2. Why `revalidateTag` works across routes

The tag cache lives on the **Next.js server** (the Data Cache) — not in the browser, not in a CDN.
When a Server Component does `fetch(url, { next: { tags: ["jobs"] } })`, the server stores the
response in its Data Cache and records `"jobs"` against that entry. Because the cache is a single
server-side store keyed **by tag, not by file or directory**, a tag set inside `jobs/page.tsx` and
a `revalidateTag("jobs")` call made inside a Server Action in `app/actions/closeJob.ts` reference
the *same* store. The string `"jobs"` is the only thing that has to match.

**First request to `/jobs` after revalidation:** it is **fetched fresh**, not served from cache.
`revalidateTag` marks the tagged entries stale; the next request finds no valid cached entry, so it
re-runs the `fetch`, renders with the new data, and re-populates the cache. Every request after
that is served from cache again until the next revalidation.

### 3. What `Promise.all` failure means for the page

`ListingsTable` does `Promise.all([getJobs(), getApplicationStats()])`. `Promise.all` rejects as
soon as *any* input rejects — so if `getApplicationStats()` throws (stats endpoint 500s), the whole
`await` throws and **the user sees the route's error UI** instead of the table; the jobs data that
loaded fine is thrown away with it.

Two ways to show **partial** data:
1. **`Promise.allSettled`** — never rejects; render the table from the fulfilled jobs result and
   fall back to `0` for the application column when the stats result is `rejected`.
2. **Per-source error handling** — give each fetch (or each child Server Component + boundary) its
   own `try/catch` so a stats failure degrades only the stats column.

**For a production employer dashboard I would choose option 2.** It composes with the streaming
design already in place — each source already has its own Suspense boundary, so giving each its own
error boundary means a stats outage degrades the stat card alone while the listings table (the
employer's core workflow) stays fully usable.

### 4. The two-boundary vs one-boundary trade-off

With **two** independent `<Suspense>` boundaries:

| Time | What the user sees |
|---|---|
| **T=0ms** | Streamed shell: the **page heading** + **both skeletons** |
| **T=120ms** | `ApplicationsSummary` resolves → real **Total Applications** card; table still a skeleton |
| **T=450ms** | `ListingsTable` resolves → real **table** |
| **T=451ms** | Page complete |

With a **single** `<Suspense>` wrapping both, at **T=120ms** the user would **still see the fallback
skeleton for the whole block** — a boundary resolves only when *everything inside it* has resolved,
so the fast card would be held back, invisible, until the slow table finished too (330ms wasted).

---

## README Updates

### 1. Tracing the close action end to end

1. **(Browser)** The employer clicks **Close Listing** in `CloseJobButton` (`"use client"`) — the
   submit control of a `<form action={formAction}>` whose `formAction` comes from
   `useActionState(closeJobListing, null)`.
2. **(Browser → Server)** React serialises the form's `FormData` (the hidden `jobId`) and invokes
   the **Server Action** over its internal RPC. `isPending` flips `true`, so the button shows
   **"Closing…"** and is disabled — no client `fetch` to the PATCH endpoint is made from the browser.
3. **(Server)** `closeJobListing` reads `jobId`. If missing/empty it returns an error state
   immediately, with **no network call**.
4. **(Server)** It sends `PATCH /api/jobs/${jobId}` with `{ status: "Closed" }`. The handler
   persists the status override and returns the updated job (or Problem Details, surfaced as an
   error state).
5. **(Server)** On success it calls **`revalidateTag("jobs")`** (and `revalidateTag(`job-${jobId}`)`),
   marking every Data-Cache entry labelled `"jobs"` stale — on the dashboard *and* the candidate
   board — **before** the response is sent back.
6. **(Browser)** The action returns `{ status: "success", jobTitle }`; `useActionState` exposes it
   as `state`, and the button is replaced by the **"Closed …"** confirmation.
7. **(Candidate, next load)** The next `/jobs` request finds its `"jobs"` cache invalidated, so it
   **fetches fresh** — the job now reports `"Closed"` — and the candidate sees the update. The
   `/jobs/[id]` page shows the "no longer accepting applications" message instead of the apply form.

### 2. Why two Suspense boundaries are better than one here

At **T=120ms** with two boundaries the candidate sees the **real Total Applications card** while the
table is still a skeleton; with one boundary they still see **only skeletons**, because a boundary
waits for *all* its children. Two boundaries let the cheap, fast fetch paint independently of the
expensive, slow one.

**When one boundary is the right call:** when the two pieces are not independently useful — e.g. a
stat card whose numbers are *derived from the very rows in the table* and would mislead on their
own, or a layout where revealing one half early causes a jarring reflow. If the page should "snap
in" as one unit, a single boundary (one fallback, one resolution) is the better experience.

### 3. The self-contained component trade-off

`ListingsTable` fetches its own jobs **and** stats with `Promise.all` internally, so it is
drop-anywhere self-contained. The alternative is a pure component taking `jobs` and `stats` as
props, with the parent fetching.

- **Self-contained cost across three instances:** the fetches run **three times** — three
  round-trips, three Suspense resolutions that can't be coordinated, and you can't unit-test the
  table with fixtures without mocking `fetch`.
- **Prop-driven cost under Suspense streaming:** the **parent** must await, so the parent suspends
  — collapsing independent streaming and becoming the bottleneck for everything below it.

**If reused in five places I would choose the prop-driven (pure) design** and lift the fetch into a
single parent / shared cache: fetch once, pass to all five. It is the clearer, more testable
contract and avoids five separate Suspense resolutions for identical data.

### Stretch B — Per-job cache tags

`/jobs/[id]` is tagged `["jobs", `job-${id}`]` and `closeJobListing` calls **both**
`revalidateTag("jobs")` and `revalidateTag(`job-${jobId}`)`. **Why both:** if the action cleared
only `job-${jobId}`, the closed job's *detail* page would refresh, but the candidate **`/jobs`
listing** — whose fetch is tagged only `"jobs"` — would keep serving its cached page and still show
the job as **Active**. Clearing `"jobs"` refreshes the *list*; clearing `job-${jobId}` is the
targeted refresh of that one *detail* page. The two surfaces are cached under different tags, so you
need both.

---

## Build gate

`npx tsc --noEmit` exits **0**. `npm run build` completes with **zero TypeScript and zero ESLint
errors**:

```text
 ✓ Compiled successfully in 37.6s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (21/21)
   Finalizing page optimization ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      817 B         107 kB
├ ƒ /api/applications/stats                148 B         103 kB
├ ƒ /api/jobs                              148 B         103 kB
├ ƒ /api/jobs/[id]                         148 B         103 kB
├ ƒ /dashboard/listings                  1.88 kB         108 kB
├ ƒ /jobs                                2.17 kB         108 kB
├ ƒ /jobs/[id]                           4.44 kB         110 kB
└ ○ /signup                              1.66 kB         111 kB
+ First Load JS shared by all             102 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

The five Assignment 2.2 surfaces (`/api/applications/stats`, `/api/jobs/[id]`, `/jobs`,
`/jobs/[id]`, `/dashboard/listings`) are all `ƒ` — the jobs reads are cached in the Data Cache by
their `"jobs"` tag, while the routes render per request.

---

## Project structure (2.2 touch-points)

```
src/
├─ app/
│  ├─ actions/closeJob.ts              # Part 6 — Server Action ("use server")
│  ├─ api/
│  │  ├─ applications/stats/route.ts   # Part 2 — GET stats / POST 405
│  │  └─ jobs/[id]/route.ts            # Part 2 — GET + PATCH (close)
│  ├─ dashboard/listings/page.tsx      # Part 5 — two Suspense boundaries
│  └─ jobs/
│     ├─ (board)/page.tsx              # Part 3 — tagged jobs fetch
│     └─ [id]/page.tsx                 # Part 3 + Stretch B — tagged detail fetch
├─ components/
│  ├─ ApplicationsSummary.tsx          # Part 5 — fast async server component
│  ├─ ListingsTable.tsx                # Parts 4–6 — parallel fetch + join + Action column
│  ├─ CloseJobButton.tsx               # Part 6 — useActionState client component
│  └─ RealApplyPanel.tsx               # in-app apply (fixes the apply crash)
└─ lib/
   ├─ jobs-api.ts                      # API base + view adapters + ApplicationStat type
   └─ server-store.ts                  # persistent store + job-status overrides
```

Walkthrough: **`docs/assignment-2.2/CareerHub-2.2-Walkthrough.html`**.
