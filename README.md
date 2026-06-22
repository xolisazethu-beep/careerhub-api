# CareerHub Frontend — Assignment 1.3

**Server State & TanStack Query**

CareerHub is a job-listings browser built with **Next.js 15 (App Router)**, **React 19**,
**TypeScript (strict)** and **Tailwind CSS v4**.

Assignment 1.2 produced a visually complete app driven by a **hardcoded array** in `page.tsx`.
Assignment 1.3 replaces that array with **live data fetched over HTTP** using **TanStack Query
v5**. The job page now loads real data from a Next.js route handler, shows a structure-matched
skeleton while the request is in flight, renders an error panel with a retry button on failure,
and caches the result in TanStack Query's client store.

**No component from 1.1 or 1.2 was modified** — `JobCard`, `JobList`, `JobStatusBadge`,
`ThemeToggle` and `AvailabilityBadge` are all data-agnostic. The only files that changed are the
entry points (`page.tsx`, `layout.tsx`) plus three new files (`api/jobs/route.ts`,
`providers.tsx`, `lib/api.ts`) and the skeleton (`JobCardSkeleton.tsx`).

> A full illustrated walkthrough of every part — code, line-by-line explanation, UI effect and a
> beginner-friendly summary — is in **`CareerHub-1.3-Walkthrough.pdf`**.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build — must be clean (see "Gate" below)
npm start        # serve the production build
```

Requires Node 18.18+ (developed on Node 22).

### Environment

Create a `.env.local` in the project root:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

This file is git-ignored (`.env*` is in `.gitignore`). When it is absent, `fetchJobs` falls back
to a relative `/api/jobs` URL, so the app still works against its own built-in mock API.

### A note on fonts

The fonts (Inter + Plus Jakarta Sans) are **self-hosted** via `next/font/local` from
`src/fonts/*.woff2` rather than fetched from Google Fonts. This keeps builds fully offline,
avoids a third-party request on every page load, and sidesteps the GDPR concerns of Google Fonts.

---

## Part 1 — Written Decisions

### 1. Server state vs client state — four things `useQuery` gives you for free

1. **Loading and error state as first-class values.** `useQuery` returns `isPending`, `isError`
   and `error` already tracked. A manual `useEffect`+`useState` needs three separate state
   variables (`data`, `loading`, `error`) hand-wired and reset in the right order. *If absent:*
   the developer forgets one path and the user stares at a blank screen with no spinner and no
   message when the request hangs or fails.
2. **Request deduplication via the `queryKey`.** Ten components asking for `["jobs"]` trigger
   **one** network request; all ten share the cached result. Manual fetch fires ten identical
   requests. *If absent:* the user's browser hammers the API on every screen that needs jobs,
   wasting bandwidth and slowing every render that mounts.
3. **Caching with stale-while-revalidate.** Navigating away and back shows the **cached** data
   instantly while a background refetch silently updates it. A manual `useEffect` with `[]`
   re-fetches from scratch every mount. *If absent:* every navigation flashes a loading spinner
   and the user waits for data they already saw seconds ago.
4. **Automatic refetch on window focus / reconnect + retries.** TanStack Query refetches when
   the tab regains focus or the network reconnects, and retries failed requests with backoff.
   Manual code does none of this. *If absent:* a user who leaves the tab for an hour comes back
   to stale listings, and a single transient network blip leaves a permanent error with no
   self-recovery.

### 2. The `queryKey` contract

TanStack Query uses the `queryKey` as the **cache identity** for a query: it is how the cache
stores, looks up, deduplicates and invalidates a result. Two queries with the same key are
treated as the same data; a change in the key is treated as a different query (and triggers a
new fetch).

- **Two components accidentally *share* a key they should not.** A jobs list keyed `["jobs"]`
  and a *single job detail* fetch also keyed `["jobs"]`. They overwrite each other in the cache:
  whichever resolved last wins, and the other component renders the wrong shape. *User-visible
  symptom:* the list page suddenly shows a single job (or crashes mapping over a non-array), or
  the detail page renders a whole array's worth of garbage.
- **A component uses a *unique* key when it should *share* one.** Two job lists keyed
  `["jobs", Math.random()]` (or `["jobs", Date.now()]`) never match, so the cache treats every
  mount as new. *User-visible symptom:* the data refetches and flashes a skeleton on every
  navigation even though nothing changed, and the shared cache never warms up — exactly the
  manual-`useEffect` problem TanStack Query was supposed to solve.

### 3. Why `fetch` does not throw on HTTP errors

`fetch` only **rejects** on a *network-level* failure — DNS failure, no connection, CORS block,
request aborted. An HTTP **404** or **500** is still a *successful round-trip at the transport
level*: the server was reached and answered. So the promise **resolves**, and `res.ok` is
`false` (it is `true` only for 200–299). That is precisely the case `res.ok` exists to catch.

If the teammate removes the `res.ok` check and nothing throws, TanStack Query sees a **resolved**
`queryFn` and stores whatever `res.json()` produced as **success data** — typically the error
body (`{ "error": "Not Found" }`) or a thrown JSON-parse exception on an HTML error page.
*User-visible result:* the UI leaves the loading state and renders the "success" branch against
junk — an empty grid, `undefined` fields rendering as blanks, or `jobs.map is not a function`
crashing the page. The error state never shows and the "Try again" button never appears, because
TanStack Query was never told anything went wrong. Throwing on `!res.ok` is what routes HTTP
errors into the `isError` path.

### 4. Stale-while-revalidate

TanStack Query's default `staleTime` is `0`, so data is considered stale immediately and a
return to the browser tab triggers a **background refetch**. Crucially, the data already on
screen **stays rendered** the entire time — the user sees the existing job grid, not a spinner.
`isPending` is `false` (we have data); only the background `isFetching` flag flips. When the new
data arrives it swaps in seamlessly; if it is identical, nothing visibly changes.

Contrast with a `useEffect(…, [])` fetch: `[]` runs the effect **once on mount and never again**,
so it does *not* refetch on tab focus at all — the user would keep seeing stale data forever
until a full reload. (And if you *did* re-fetch by adding focus handling manually, the naive
version clears `data` to show a spinner, so every tab focus would flash a loading state over
content the user was already reading.) Stale-while-revalidate gives freshness **without** the
flash.

---

## Part 2–6 — Proving It Changed

- **Route handler** (`src/app/api/jobs/route.ts`): `GET /api/jobs` returns the seed listings via
  `NextResponse.json()`. The data covers all four `EmploymentType` values and includes one
  `isActive: false` listing (Luno DevOps). Only `GET` is exported, so other methods get a 405.
- **Providers** (`src/app/providers.tsx`): a Client Component that creates the `QueryClient` with
  the **`useState` initialiser form** (`useState(() => new QueryClient())`, never a module-level
  variable — that would leak cache across requests on the server), wraps `children` in
  `QueryClientProvider`, and mounts `<ReactQueryDevtools initialIsOpen={false} />`. `layout.tsx`
  wraps `{children}` in `<Providers>` and **stays a Server Component** — no `"use client"`.
- **API layer** (`src/lib/api.ts`): `fetchJobs` reads `process.env.NEXT_PUBLIC_API_URL`, builds
  the full URL, calls `fetch`, throws an `Error` *including the HTTP status code* when `!res.ok`,
  and returns the parsed JSON typed as `JobListing[]`. It imports nothing from React.
- **Skeleton** (`src/components/JobCardSkeleton.tsx`): `JobCardSkeleton` mirrors every region of
  `JobCard` (badge row, title, company line, salary, closing line, footer) with `animate-pulse`
  bars carrying both light (`bg-slate-200`) and dark (`dark:bg-slate-700`) backgrounds and **no
  real text**. `JobListSkeleton` renders **six** in `JobList`'s exact grid.
- **`page.tsx`**: the hardcoded `JOBS` import is gone. `useQuery({ queryKey: ["jobs"], queryFn:
  fetchJobs })` is destructured as `data: jobs, isPending, isError, error, refetch`. Pending →
  `<JobListSkeleton />` only; error → styled panel showing `error.message` + a "Try again" button
  calling `refetch()`; success → `<JobList />` against live data. The sessionStorage restore
  effect no longer validates against `jobs` (undefined while pending) — a stale id simply leaves
  `selectedJob` as `null` and nothing renders, degrading gracefully.

`.env.local` holds `NEXT_PUBLIC_API_URL=http://localhost:3000` and is ignored by git (`.env*` in
`.gitignore`).

---

## README Updates

### 1. What TanStack Query manages (vs. hand-rolling it)

| `useQuery` tracks automatically | What you'd write manually with `useState`+`useEffect`+`fetch` |
| ------------------------------- | -------------------------------------------------------------- |
| `data` (`jobs`)                 | `const [data, setData] = useState<JobListing[]>()` plus the `setData` in the effect's resolve path. |
| `isPending` / loading           | `const [loading, setLoading] = useState(true)`; set `true` before fetch, `false` in a `finally`. Easy to forget the `finally`, leaving a permanent spinner on error. |
| `isError` + `error`             | `const [error, setError] = useState<Error \| null>(null)`; `try/catch` around the fetch, plus remembering to **reset** it to `null` on a retry. |
| `isFetching` (background)        | A *second* boolean distinct from `loading`, so a refetch doesn't blank the screen — almost nobody writes this by hand. |
| Caching across mounts            | A module-level cache object keyed by query + manual read/write + invalidation logic. |
| Dedupe of in-flight requests     | A map of in-flight promises so concurrent callers await the same request. |
| Refetch on focus / reconnect     | `window.addEventListener("focus", …)` + `navigator.onLine` listeners, wired and torn down in effects. |
| Retry with backoff               | A retry counter, a `setTimeout` backoff schedule, and an AbortController to cancel stale attempts. |
| Stale time / refetch scheduling  | Timestamp tracking per cache entry plus comparison logic on every read. |

The manual column is roughly 60–80 lines of fragile, edge-case-ridden code — and still misses
deduplication and focus refetch in practice. `useQuery` is two lines.

### 2. The `queryKey` design decision

`["jobs"]` means "the canonical, unfiltered list of all jobs." It is the cache address every
consumer of the full list shares.

If the page could filter by location — "Auckland" vs "Wellington" — the **filter value must
become part of the key**: `["jobs", { location }]` (e.g. `["jobs", { location: "Auckland" }]`).
The reason: the key *is* the cache identity. If `location` were left out of the key, switching
from Auckland to Wellington would not change the key, so TanStack Query would serve the **cached
Auckland results** for Wellington — the user picks Wellington and sees Auckland jobs. Putting the
filter in the key gives each filter value its own cache entry, so each is fetched once, cached
independently, and switching back to Auckland is instant from cache.

### 3. Skeleton design rationale

`JobCardSkeleton` mirrors the exact structure of `JobCard` — same badge row, title, company,
salary, footer, in the same grid — rather than showing a single centered spinner, to prevent
**layout shift**. Layout shift (the "L" in Cumulative Layout Shift, a Core Web Vital) is when
content jumps position *after* it first paints because something of a different size loaded in.
A spinner occupies a tiny fixed box; when six full cards replace it, everything below lurches
down and the user loses their place — and may misclick a control that just moved. A
structure-matched skeleton reserves the **same footprint** the real cards will occupy, so when
data arrives the grey bars are simply swapped for content of identical size: **zero** reflow,
zero jump. The skeleton also communicates *what is coming* (a grid of cards), which a spinner
does not.

### 4. Gate

`npm run build` completes with **zero TypeScript errors and zero ESLint errors**:

```
> careerhub-frontend@0.1.0 build
> next build

   ▲ Next.js 15.5.19
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 59s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (13/13)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    22.7 kB         134 kB
├ ○ /_not-found                            993 B         103 kB
├ ○ /about                                 810 B         107 kB
├ ƒ /api/jobs                              123 B         103 kB
├ ○ /applications                        5.95 kB         112 kB
├ ƒ /apply/[jobId]                       7.18 kB         113 kB
├ ○ /contact                               797 B         103 kB
├ ○ /forgot-password                     2.59 kB         108 kB
├ ○ /login                               3.07 kB         109 kB
├ ○ /recruiter                           5.66 kB         112 kB
├ ○ /recruiter/signin                     5.1 kB         108 kB
└ ○ /signup                              3.16 kB         109 kB
+ First Load JS shared by all             102 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

The new `ƒ /api/jobs` route is **server-rendered on demand** (a route handler), and `/` now
carries the TanStack Query runtime (134 kB First Load JS).

---

## Project structure

```
src/
  app/
    layout.tsx              # fonts, <Providers>, navbar + footer shell (Server Component)
    providers.tsx           # "use client" — QueryClientProvider + Devtools  (NEW)
    page.tsx                # Home — useQuery instead of a hardcoded array
    globals.css             # @import "tailwindcss" + theme tokens
    api/jobs/route.ts       # GET /api/jobs — mock backend, NextResponse.json  (NEW)
  components/
    JobCard.tsx             # unchanged from 1.1/1.2 — data-agnostic
    JobList.tsx             # unchanged — responsive grid, id keys, empty state
    JobCardSkeleton.tsx     # JobCardSkeleton + JobListSkeleton  (NEW)
    JobStatusBadge.tsx  SummaryPanel.tsx  FilterBar.tsx  Navbar.tsx  Footer.tsx
  lib/
    api.ts                  # fetchJobs — pure network layer, no React  (NEW)
    seed-jobs.ts            # JOBS seed data served by the route handler
    format.ts  employmentType.ts  utils.ts
  types/
    index.ts                # JobListing + EmploymentType — the type contract
  fonts/                    # self-hosted woff2
```

---

# Assignment 1.4 — Applications & Mutations

Assignment 1.3 made the board **read** live data. 1.4 makes it **write**: a candidate can apply
for a job directly from the listing page — no page reload — with **React Hook Form** collecting
input, **Zod** validating it before anything leaves the browser, and **`useMutation`** sending it
and driving every state in the request lifecycle (loading, server rejection, success).

> `JobCard`, `JobList`, `JobStatusBadge`, `ThemeToggle` and `JobCardSkeleton` were **not
> modified**. The application form is a new surface added below the existing selection panel.

New/changed files for 1.4:

```
src/
  app/
    api/
      applications/route.ts            # POST submit (800ms delay, validation) · GET -> 405   (NEW)
      applications/list/route.ts       # GET applications (recruiter read side)               (NEW)
      applications/[id]/route.ts       # PATCH status — accept/reject decision                (NEW)
      jobs/route.ts                    # GET board = seed + recruiter jobs, live counts        (NEW)
      jobs/[id]/route.ts               # GET one listing (detail)                              (NEW)
      recruiter/jobs/route.ts          # GET/POST recruiter postings                           (NEW)
    page.tsx                           # renders <ApplicationForm> on job selection
    recruiter/page.tsx                 # post jobs to the API, live applicant counts
    recruiter/jobs/[jobId]/page.tsx    # applicant review — view CV/details, accept/reject     (NEW)
  components/
    ApplicationForm.tsx                # Zod schema + RHF + useMutation                        (NEW)
  lib/
    server-store.ts                    # the server-side "database" (file-backed JSON)         (NEW)
    api.ts                             # + submitApplication, recruiter API client fns
  types/
    index.ts                           # + ApplicationRequest, ApplicationResponse, ...
```

## Part 1 — Written Decisions

### 1. Why `@hookform/resolvers` is a separate package

React Hook Form (RHF) and Zod are each useful on their own and neither should depend on the
other. RHF supports *many* validation libraries (Zod, Yup, Joi, Valibot, Superstruct, ...); Zod
is a general-purpose schema library used far beyond forms. If RHF imported Zod directly it would
force a Zod dependency (and a specific version) on every RHF user, and Zod would gain a reason to
care about RHF's internals. `@hookform/resolvers` is the **adapter layer** that keeps both
libraries independent: it depends only on RHF's resolver contract and ships one small adapter per
validation library, so each library releases on its own schedule and a breaking change in one
ripples through the thin resolver, not the other library.

**What `zodResolver` does at runtime.** `zodResolver(schema)` returns a **resolver function** that
RHF calls on submit (and on the configured validation events). Its signature is:

```ts
(values, context, options) => Promise<
  | { values: T; errors: {} }            // success: parsed output
  | { values: {}; errors: FieldErrors }  // failure: field-keyed errors
>
```

- It **receives** the current form `values` (an object of all registered field values), the
  optional `context`, and an `options` object (which fields/names RHF is validating, criteria
  mode, etc.).
- It **calls** `schema.safeParseAsync(values)` (Zod's non-throwing parse) on the Zod schema.
- It **returns** one of two shapes. On success: `{ values, errors: {} }` — where `values` is the
  **parsed/coerced** output (so a `z.coerce.number()` field comes back as a real `number`). On
  failure: `{ values: {}, errors }` — where `errors` is Zod's `ZodError` issues re-keyed by field
  path into RHF's `FieldErrors` shape (`{ fieldName: { type, message } }`), which is exactly what
  populates `formState.errors`.

So the resolver is a pure translator: form values in, "parsed values **or** field-keyed errors"
out — the one shape RHF understands, regardless of which validation library produced it.

### 2. The number input problem

`<input type="number" />` hands JavaScript the value as a **string** (e.g. `"5"`), even though
the control displays a number. Zod's `z.number()` is strict and **rejects a string** — it does
not silently parse it.

- **Solution A — `register("years", { valueAsNumber: true })`.** The conversion happens **in RHF,
  at the input boundary**. Before RHF stores the field value (and therefore before the resolver
  ever sees it), RHF runs `valueAsNumber` and converts the DOM string to a `number`. By the time
  Zod validates, the value is already a number, so plain `z.number()` accepts it.
- **Solution B — `z.coerce.number()` in the schema.** The conversion happens **in Zod, inside the
  resolver**. RHF still stores the raw string; when `safeParse` runs, `z.coerce.number()` does
  `Number(value)` first and then applies the numeric checks (`.int()`, `.min()`, ...).

**Why both yield the same `z.infer` type.** `z.infer<>` reports a schema's **output** type. In
both designs the value that exits validation is a `number`: in Solution A it is already a number
when it reaches `z.number()` (output `number`); in Solution B `z.coerce.number()` outputs `number`
by definition. The *input* type differs (A feeds Zod a number, B feeds Zod `unknown`), but
`z.infer` only looks at the output, so `z.infer<typeof schema>` is identical either way.

**Used here: Solution B (`z.coerce.number()`).** It keeps **all** validation and conversion in the
schema — the single source of truth this assignment insists on — so `register("...")` carries no
options at all, and the rule cannot drift from the conversion. (Because the input and output types
now differ, the form is typed with RHF's three generics:
`useForm<z.input<...>, unknown, z.output<...>>`.)

### 3. `mutate` vs `mutateAsync` — the `isSubmitting` timing bug

`handleSubmit(onValid)` returns an async function; RHF sets `formState.isSubmitting = true`,
**awaits the promise `onValid` returns**, and only then sets it back to `false`.

- `mutation.mutate(data)` is **fire-and-forget**: it kicks off the request and returns **`void`**
  *synchronously*. So if `onValid` calls `mutate(data)` and returns, the promise RHF awaits
  resolves **immediately** — long before the 800ms request settles. RHF flips `isSubmitting` back
  to `false` mid-flight, and a button disabled on `isSubmitting` alone re-enables while the
  request is still running. That is the bug.
- `mutation.mutateAsync(data)` returns a **`Promise`** that resolves/rejects when the request
  actually settles. By `await`-ing it inside `onValid`, the promise RHF awaits is now tied to the
  real request, so `isSubmitting` stays `true` for the full 800ms and only drops once the server
  responds. (We `try/catch` the `await` so a rejection doesn't become an unhandled error — the
  failure is surfaced via `mutation.isError` instead.)

This project uses `mutateAsync`.

### 4. `onSuccess` placement

- **Option A (in the `useMutation` options object)** fires on **every** successful run of this
  mutation, no matter which call site triggered it. It is part of the mutation's identity.
- **Option B (second argument to `mutate`/`mutateAsync`)** fires only for **that one call**. If the
  mutation is invoked from several places, a per-call `onSuccess` runs for that call only — and
  notably, a per-call callback is **not** invoked if the component unmounts before the request
  resolves, whereas the options-object callback still runs.

**Concrete difference:** imagine the same submit mutation is called from both the inline form and a
"quick apply" button elsewhere. An Option-A `onSuccess` that invalidates `["jobs"]` runs for
**both**; an Option-B callback attached to only the form's call would leave the quick-apply path
without the cache refresh.

**Used here: Option A** to invalidate `["jobs"]` and `reset()` the form. Invalidating the board (so
applicant counts refetch) and clearing the form are intrinsic to *every* successful submit, not
specific to one call site — so they belong to the mutation, not the call. It also keeps `onValid`
focused purely on building the request and awaiting it.

## Part 5 — Schema design decisions

### The `phone` / `linkedInUrl` optional pattern

`z.string().optional()` accepts `string | undefined` — but an HTML text input the user leaves
blank does **not** submit `undefined`; it submits the **empty string `""`**. `""` is a `string`,
so it passes `.optional()` but then **fails** the `.regex(...)` / `.url(...)` check, producing a
validation error on a field the user intentionally left empty. That is the wrong behaviour for an
optional field.

`.or(z.literal(""))` fixes it by widening the schema to "a valid value **OR** the empty string":

```ts
phone: z.string().regex(phoneRegex, "Enter a valid phone number.")
       .or(z.literal(""))
       .optional(),
linkedInUrl: z.url("Enter a valid URL.")
       .refine((v) => v.includes("linkedin.com"), "Must be a LinkedIn URL.")
       .or(z.literal(""))
       .optional(),
```

Now a blank field validates cleanly (it matches `z.literal("")`), a filled field must satisfy the
real rule, and `.optional()` still permits the key being absent. The inferred type is
`string | undefined` (the `""` literal collapses into `string`). On submit the form treats an empty
string as "not provided" and **omits the key** from the request body, so `ApplicationRequest.phone?`
/ `.linkedInUrl?` are genuinely absent rather than empty.

### The cross-field `.refine`

`.refine()` is attached to the **object** schema, so its first argument is the **whole parsed
object** — every field at once — which is what lets it compare two fields:

```ts
.refine((data) => data.availableImmediately || data.noticePeriodWeeks > 0, {
  message: "If you're not available immediately, your notice period must be at least 1 week.",
  path: ["noticePeriodWeeks"],
});
```

The **`path` option** tells Zod which field the resulting error belongs to. Without it, the issue
is attached to the **form root** (empty path) instead of a field, so `errors.noticePeriodWeeks` is
`undefined` and the message never renders next to the input. With `path: ["noticePeriodWeeks"]` the
error lands on the notice-period field and the conditional `<p>` shows it exactly where the user
can fix it.

A field-level `.min(1)` on `noticePeriodWeeks` **cannot** express this, because the requirement is
**conditional on another field**. `.min(1)` would force a notice period of >=1 for *everyone*,
including candidates who *are* available immediately (for whom the value is meant to be ignored). A
single field's validator only sees that field; only an object-level `.refine` can read
`availableImmediately` and `noticePeriodWeeks` together.

### The two loading flags

`const isBusy = isSubmitting || mutation.isPending;`

Timeline of one click -> response:

1. **t=0** click. RHF runs the resolver (Zod). During async validation `isSubmitting` is already
   `true`; `mutation.isPending` is still `false` (no request yet).
2. **validation passes**, `onValid` runs and calls `await mutateAsync(...)` -> `mutation.isPending`
   becomes `true`. Both flags are now `true` for the ~800ms request.
3. **t~=800ms** server responds. `mutateAsync` resolves, `mutation.isPending` -> `false`, the
   awaited promise settles, and RHF sets `isSubmitting` -> `false`.

So between **t=0 and the request starting**, `isSubmitting` is `true` while `mutation.isPending` is
still `false` — that early window is exactly why one flag alone is insufficient and we OR them.

**Can `mutation.isPending` outlast `isSubmitting`?** With `mutateAsync` correctly awaited, **no.**
Because `onValid` awaits `mutateAsync`, RHF cannot resolve the submit (and flip `isSubmitting` to
`false`) until the mutation has already settled — so `isSubmitting` turns off **at the same time as
or after** `isPending`, never before. (It is only with the **`mutate`** bug from Q3 that
`isSubmitting` drops first and `isPending` outlives it.)

## Extra requirements — recruiter applicant management

Beyond the brief, CareerHub now closes the loop for the **other** side of the marketplace, on
**both the UI and the database (API)**:

1. **A recruiter sees jobs they add on the job board.** Posting a job (`/recruiter`) does a
   `POST /api/recruiter/jobs` into the server store. `GET /api/jobs` merges those postings with the
   seed board, so the recruiter's own listing appears on the public board immediately and is
   applyable like any other.
2. **Applicant counts.** Each listing's `applicantCount` is computed **live** from the application
   store, so it climbs as candidates apply (and is what the `["jobs"]` invalidation refetches after
   a submit). The dashboard shows a per-job applicant count.
3. **Review applicants — CV & details.** `/recruiter/jobs/[jobId]` lists every candidate for that
   job with their full details (name, email, phone, years of experience, availability, LinkedIn)
   and their cover letter (their pitch / CV), read from `GET /api/applications/list?jobId=...`.
4. **Accept / reject -> status reflected.** Accept and Reject buttons `PATCH /api/applications/[id]`
   with the new status. Because the decision is written to the server store, every subsequent read
   reflects it — the status badge updates and the change is durable.

`RecruiterDecisionStatus` is `"Submitted" | "Under review" | "Accepted" | "Rejected"`; a new
application starts at `Submitted`.

## README — Gate

`npm run build` must complete with **zero TypeScript errors and zero ESLint errors**. Final output:

```
> careerhub-frontend@0.1.0 build
> next build

   ▲ Next.js 15.5.19
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 3.0min
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (16/16)
   Finalizing page optimization ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    39.4 kB         169 kB
├ ○ /_not-found                            993 B         103 kB
├ ○ /about                                 811 B         107 kB
├ ƒ /api/applications                      139 B         103 kB
├ ƒ /api/applications/[id]                 139 B         103 kB
├ ƒ /api/applications/list                 139 B         103 kB
├ ƒ /api/jobs                              139 B         103 kB
├ ƒ /api/jobs/[id]                         139 B         103 kB
├ ƒ /api/recruiter/jobs                    139 B         103 kB
├ ○ /applications                        7.29 kB         113 kB
├ ƒ /apply/[jobId]                       4.21 kB         124 kB
├ ○ /contact                               798 B         103 kB
├ ○ /forgot-password                     2.59 kB         108 kB
├ ○ /login                               3.06 kB         109 kB
├ ○ /recruiter                           4.58 kB         124 kB
├ ƒ /recruiter/jobs/[jobId]              3.07 kB         133 kB
├ ○ /recruiter/signin                    5.12 kB         108 kB
└ ○ /signup                              3.16 kB         109 kB
+ First Load JS shared by all             102 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Zero TypeScript errors, zero ESLint errors.
