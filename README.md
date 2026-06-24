# CareerHub — Assignment 2.2

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
