# CareerHub — Assignment 3.3

**Performance & SEO — “Fast by default, findable by design.”**

> The latest milestone. Earlier write-ups (3.2, 2.3, 2.2, 3.1) are preserved further down.

This assignment makes every user-facing page **discoverable** (metadata + Open
Graph), **shareable** (per-job titles/descriptions) and **fast** (image
optimisation + code-splitting the heaviest client component). Everything runs
against the **real CareerHub backend** (`NEXT_PUBLIC_API_BASE_URL`) — no mock data.

---

## ▶ How to run this project (VS Code terminal — PowerShell)

```powershell
# 0. From the project root: C:\Users\Xolisa\assignment-3.2
# 1. Install dependencies (adds @next/bundle-analyzer + cross-env for 3.3)
npm install

# 2. Point the frontend at your REAL backend in .env.local
#    NEXT_PUBLIC_API_BASE_URL=http://localhost:5080   (your ASP.NET + Postgres API)
#    NEXT_PUBLIC_SITE_URL=http://localhost:3000        (metadataBase for OG tags)
#    -> start the backend FIRST so job reads succeed.

# 3. Run the dev server (Lighthouse "before/after" runs against this)
npm run dev
#    open http://localhost:3000

# 4. Verify the whole 3.3 checklist
npx tsc --noEmit          # types: must print nothing (0 errors)
npm run test:run          # tests: all pass (this repo has 8)
npm run build             # production build: must succeed
npm run analyze           # opens the bundle treemaps (client/nodejs/edge .html)
```

> **Lighthouse:** open the page in Chrome → DevTools (F12) → **Lighthouse** tab →
> Mode **Navigation**, Device **Desktop**, Categories **Performance / SEO /
> Best Practices** → *Analyze page load*. Run it on `/` and one `/jobs/[id]`.

---

## What changed in 3.3 (file-by-file, the lines that matter)

| Area | File (folder) | Key change |
|---|---|---|
| **Title template + metadataBase + OG** | `src/app/layout.tsx` | `metadata` export: added `metadataBase: new URL(...)` (L~28), already had `title.template` `"%s · CareerHubX"`, `openGraph.siteName`/`type`. |
| **Per-job SEO** | `src/app/jobs/[id]/page.tsx` | new `generateMetadata()` (top of file) → job title + `"Apply for … at … in …"` description + `openGraph`; returns `{ title: "Job Not Found" }` on 404. |
| **Dedup data layer** | `src/lib/jobs-api.ts` | new `getJob = cache(async (id) => …)` — one `react` `cache()`-wrapped fetch reused by BOTH `generateMetadata` and the page body. |
| **LCP image** | `src/app/page.tsx` + `public/hero-careerhub.svg` | `<Image priority width={1200} height={600}>` hero (Candidate A). |
| **Remote logo** | `src/components/JobLinkCard.tsx` | `<Image>` company logo from `ui-avatars.com` (Candidate B), **no** `priority`. |
| **Remote domain + analyzer** | `next.config.ts` | `images.remotePatterns` for `ui-avatars.com`; wrapped in `withBundleAnalyzer`. |
| **Code-split wizard** | `src/app/apply/[jobId]/page.tsx` | static import → `dynamic(() => import(...).then(mod => ({ default: mod.default })), { ssr: false, loading: <h-96 animate-pulse skeleton> })`. |
| **Scripts** | `package.json` | `"analyze": "cross-env ANALYZE=true next build"`. |

> **Note on layout vs. the brief:** this repo keeps the Next.js app at the **repo
> root** (not in a `client/` sub-folder), and the wizard is rendered on its own
> `/apply/[jobId]` route (the `/jobs/[id]` detail page links to it), so the
> dynamic import lives there — that is “wherever `ApplicationWizard` is rendered”.

---

## Part 1 — Written Decisions

### Q1 — Image audit

| # | Image location | Source | Above the fold? | `next/image`? | Reasoning |
|---|---|---|---|---|---|
| 1 | Home hero (`src/app/page.tsx`) | local `/public/hero-careerhub.svg` | **Yes** (largest first-paint element) | **Yes + `priority`** | It is the LCP element — preloading it (not lazy-loading) is the single biggest LCP win on `/`. |
| 2 | Company logo, listing card (`JobLinkCard`) | **remote** `ui-avatars.com` (PNG) | Only the first row or two | **Yes, no `priority`** | Logos live in a scrollable list → below the fold in aggregate → should lazy-load; optimised to WebP/AVIF and given fixed 40×40 so the row doesn’t reflow. |
| 3 | Profile photo (`src/app/profile/page.tsx`) | **data URI** (user upload, `photoDataUrl`) | No (auth-only page) | **No** | A `data:` URI is already inlined bytes — the optimizer can’t re-fetch/resize it, and the page is behind auth (no SEO/LCP value). Left as `<img>` with the eslint-disable already in place. |
| — | Employer profile image | — | — | **N/A** | Not implemented in this codebase. |
| — | Nav logo / status icons | inline SVG (`lucide-react`, `brand/Logo`) | Yes | **No** | Rule: never wrap already-inline/decorative SVG icons in `next/image`. |

**Highest-priority `priority` candidate:** the **home hero** (#1). It is the
largest element painted on first load of `/`, so it *is* the LCP element;
`priority` makes Next preload it and skip lazy-loading, moving LCP earlier.

### Q2 — The ApplicationWizard loading decision

**a. `ssr: false`?** Yes. The wizard is client-only: it reads `localStorage`
drafts, the client `useSession`, and drives URL state with nuqs. With `ssr:
true` Next would render it on the server and then hydrate it, shipping and
executing that heavy JS on first paint for no benefit — and the `localStorage`
read would break/mismatch during SSR (it doesn’t exist on the server).

**b. Does eager loading harm the signed-out viewer?** On the `/jobs/[id]` detail
page a signed-out user only sees job details + a “Start application” CTA — they
never mount the wizard, so eagerly downloading its JS would waste bandwidth and
main-thread parse time. That inflates **First Load JS / TBT** (and, on slower
devices, **INP**). Code-splitting it means that cost is only paid on `/apply/[jobId]`.

**c. Why the 3.2 tests are unaffected:** the tests `import
JobApplicationWizard from "@/components/apply/JobApplicationWizard"` — a **direct
static import of the source module**. `next/dynamic` is only used at the *page*
call-site. The component file itself is unchanged, so the tests render the exact
same component synchronously. ✅ 8/8 still pass.

### Q3 — Static vs. dynamic metadata

| Page | Choice | Why |
|---|---|---|
| `/` (home) | **static `metadata`** (via layout default) | Content is identical for everyone, not per-request, not data-driven. |
| `/jobs` (listings) | **static `metadata`** (already exported on the board page) | The page title/description are constant; the *list* is data-driven but the metadata isn’t. |
| `/jobs/[id]` (detail) | **`generateMetadata`** | Title/description depend on the fetched job (per-`id`), so they must be computed at request time. |

**The dedup question:** `getJob(id)` is called by *both* `generateMetadata` and
the page component. It will **not** hit the network twice, because `getJob` is
wrapped in React’s `cache()`. `cache()` memoises by *(function reference +
arguments)* for the duration of a single server request: the first call runs the
fetch, the second returns the stored promise. **Condition for it to work:** both
call sites must invoke the *same* `getJob` reference with the *identical* `id`
string, within the same request. It would break if `generateMetadata` used a
*separate* raw `fetch` (a different function → different cache slot), or if the
two calls passed differently-typed ids. (Next also layers its Data Cache on the
`force-cache` fetch, but `cache()` is what collapses the two calls in one render.)

### Q4 — Lighthouse: before / after

> Run in Chrome DevTools → Lighthouse (Navigation / Desktop / Perf+SEO+BP).
> Paste your measured numbers below — the **direction** is what the changes target.

**Home page `/`**

| Metric | Before | After |
|---|---|---|
| Performance | ‹measure› | ‹measure› |
| LCP (value + label) | ‹measure› | ‹measure — hero `priority` targets this› |
| CLS (value + label) | ‹measure› | ‹measure — fixed image dims + skeleton target this› |
| INP (value + label) | N/A in dev | N/A in dev |
| SEO | ‹measure› | ‹measure — meta description now present› |

**Job detail `/jobs/[id]`**

| Metric | Before | After |
|---|---|---|
| Performance | ‹measure› | ‹measure› |
| LCP | ‹measure› | ‹measure› |
| CLS | ‹measure› | ‹measure› |
| INP | N/A in dev | N/A in dev |
| SEO | ‹measure — likely flags “Document does not have a meta description”› | ‹measure — `generateMetadata` adds title + description + OG› |

**SEO flags to expect *before*:** “Document does not have a meta description” on
`/jobs/[id]` (there was no metadata) — cleared by `generateMetadata`.

**Which change drove which metric (fill after measuring):**
- **SEO ↑** — `generateMetadata` on `/jobs/[id]` (was missing description/title entirely).
- **LCP ↓** — `priority` on the home hero (preloaded, not lazy).
- **CLS ≈ 0** — explicit `width`/`height` on every `next/image` + the fixed-height wizard skeleton reserve space so nothing reflows.

**One metric I could not move (INP / real LCP under load):** In `npm run dev`
**INP shows N/A** and LCP is dominated by dev-mode overhead (unminified bundles,
on-the-fly compilation, no CDN). No *code* change fixes that — it needs
**infrastructure**: a production build served from a **CDN edge** (Vercel), image
optimisation cached at the edge, and the **backend cold-start** (the Dockerised
API can take 15–30 s on first hit — see `fetchJobsApi` retry logic) removed via a
warm/always-on database. Those are hosting/data-fetching changes, not edits to
this repo.

---

## Part 4 proof — bundle split

`npm run analyze` writes treemaps to `.next/analyze/` (`client.html`,
`nodejs.html`, `edge.html`). In **client.html**, `JobApplicationWizard`’s
dependencies (React Hook Form, Zod, nuqs, Radix AlertDialog) appear as a
**separate chunk** loaded by `/apply/[jobId]`, not merged into the shared page
bundle. Build output confirms `/apply/[jobId]` is its own 3-ish kB entry rather
than dragging the wizard into First Load JS.

> 📸 **Screenshot to add:** open `.next/analyze/client.html`, find the wizard
> chunk, screenshot it into this README (`docs/` or inline).

---

# CareerHub — Assignment 3.2

**Job Application Wizard, Document Uploads & CareerHubX Branding**

> An earlier milestone. Assignment 3.3 is above; 2.3, 2.2, 3.1 are further down.

The job-application experience is now a polished, multi-step wizard, the brand
is **CareerHubX**, and the backend contract those features need is specified in
[`docs/BACKEND-GAPS.md`](docs/BACKEND-GAPS.md).

### The 5-step application wizard (`/apply/[jobId]`)

`components/apply/JobApplicationWizard.tsx` replaces the previous 3-step embedded
wizard and the single-page form. The detail page (`/jobs/[id]`) now shows a
**"Start application"** CTA that links here.

| # | Step | Collects |
|---|---|---|
| 1 | Personal information | Full name(s), surname, gender, race (optional + "Prefer not to say"), date of birth, disability status (+ details if Yes), nationality |
| 2 | Contact details | Email, phone, alternate phone, address, city, province (SA provinces + "Other"), postal code |
| 3 | Qualifications & experience | Highest qualification, institution, year completed, employment status, years of experience, LinkedIn/portfolio URLs |
| 4 | Job-specific questions | Motivation (min 100 chars), expected salary (ZAR), notice period, available start date, willing to relocate |
| 5 | Documents & consent | Required PDFs (below) + three consent checkboxes |

- **Validation:** one Zod schema (`lib/apply-wizard.ts`), per-step `trigger()` via
  React Hook Form — Next is blocked until the current step is valid.
- **URL state:** position lives in `?step=` via **nuqs**, so a refresh resumes there.
- **Progress bar:** `components/apply/WizardProgress.tsx` is reusable and
  accessible — numbered circles with `aria-current="step"`, visited steps are
  keyboard-focusable buttons, and it collapses to a compact **"Step N of M"** bar
  below the `md` breakpoint.
- **Save as Draft** on every step. ⚠️ **localStorage fallback** (`lib/apply-draft.ts`)
  until the backend draft endpoints ship — uploaded files are *not* kept in drafts
  (browser storage limit); form fields and the current step are. Pre-fills from the
  saved profile when no draft exists.
- **Submit:** AlertDialog confirmation → `sonner` success toast → redirect to
  `/applications/[id]/confirmation`, a **print-friendly** summary (`@media print`
  in `globals.css` hides the nav/footer/buttons).

### Documents step — required PDFs

All documents are **PDF only, max 3 MB**. The display name is auto-renamed to
`{userId}-{docType}.pdf` (mirroring server-side sanitisation — the client filename
is never trusted). `components/apply/DocumentUpload.tsx` provides drag-and-drop,
inline (non-toast) validation errors, file size in KB, and an AlertDialog-guarded
**Remove**.

| Document | Required | Condition |
|---|---|---|
| ID Document (SA) **or** Passport | Yes | Based on nationality (Step 1) |
| Matric Results | Yes | Always |
| Tertiary Qualification | Conditional | If Step 3 qualification is tertiary |
| Driver's Licence | Conditional | If the job requires it¹ |
| Motivation Letter | Yes | Always |
| CV / Résumé | Yes | Always |

Submit is disabled until every required document is uploaded and all three consents
("information is accurate", "consent to data processing per the Privacy Policy",
"agree to be contacted by employers") are ticked.

¹ The API has no `requiresDriversLicence` flag yet (see `docs/BACKEND-GAPS.md` §B.1);
the frontend currently infers it from the role's title/skills as a stand-in.

### Branding — CareerHubX

`components/brand/Logo.tsx` exports `<Logo>` (magnifying-glass-and-person mark plus
the two-tone "CareerHubX" wordmark) and `<LogoMark>` (icon only) as inline SVG, used
in the navbar, footer, auth shell, and `app/icon.svg` favicon. Page titles use a
`%s · CareerHubX` template.

### Backend integration

Application drafts, document storage, saved jobs, match scores and notification
settings are **not yet on the ASP.NET API** — the real C# service today only serves
job-board reads. `docs/BACKEND-GAPS.md` is the paste-ready gap list / contract for
the `careerhub-api` repo, including six fields/endpoints that the first backend
draft was missing. Until those ship, the wizard persists to `localStorage` (clearly
flagged in code), so the flow is fully functional for the demo.

---

# Testing (Week 3 Day 2)

![Tests](https://github.com/xolisazethu-beep/careerhub-api/actions/workflows/test.yml/badge.svg)

Run locally:

```bash
npm run test:run     # one-shot, exits cleanly (CI)
npm test             # watch mode
```

**Suite:** 12 tests across 5 files — `vitest` + Testing Library + `user-event`,
`jsdom`, and **MSW** for real HTTP interception. Setup lives in
`src/test/{setup.ts,utils.tsx,msw/}`; `renderWithProviders` wraps every component
in `QueryClientProvider` (retry off), the nuqs testing adapter, and `AuthProvider`,
and controls a fake `useSession`.

### A note on adaptation (important)

This assignment was written against the **old 3-step ApplicationWizard** (`useSession`,
an HTTP submit, a "review" step, a "Discard draft" banner). Assignment 3.2 replaced it
with the **5-step `JobApplicationWizard`**: auth arrives as a `user` **prop** (the page
gates with `AuthContext`), submit is a **localStorage** write, and the summary lives on
a separate confirmation page. So the demo pattern was **adapted**, not copied:

| Assignment expectation | Real component tested | Why |
|---|---|---|
| Wizard navigation/validation | `JobApplicationWizard` | The actual 5-step flow + real step headings |
| Auth gate on "Next" | `/apply/[jobId]` page (`apply-gate.test.tsx`) | Gating moved to the page (wizard assumes a user) |
| MSW submit happy/error | `ApplicationForm` (`ApplicationForm.test.tsx`) | It's the component that POSTs + `reset()`s; the wizard writes localStorage |
| AlertDialog confirm | `CloseJobButton` (`CloseJobButton.test.tsx`) | Real destructive flow (Server Action mocked — MSW can't intercept actions) |
| Draft persistence | `JobApplicationWizard` (`draft-persistence.test.tsx`) | Real jsdom localStorage round-trip |

## Part 1 — Written Decisions

### Q1 — What is worth testing?

**A. High-value behaviours.**
1. *Step gating* — Next must not advance while a step is invalid. A regression here
   lets a candidate submit half a form; a test catches it instantly.
2. *Back preserves answers* — losing typed values on Back is the exact bug that makes
   people abandon an application. High user cost, easy to regress (e.g. unmounting the form).
3. *Required-document/consent gate before submit* — submitting without a CV or consent
   is a data-integrity failure.
4. *Submit happy/error path* (ApplicationForm) — on success the form must clear; on a
   500 it must keep the user's input so they can retry. Both are invisible until they break.

**B. NOT worth testing.** Exact Tailwind class strings (`"bg-brand-600"`) and the DOM
shape (number of `<div>`s, count of `role="status"` nodes). Testing them would let a test
fail on a purely visual refactor that changed nothing the user experiences — high
maintenance cost, zero behavioural signal. We assert *roles, labels and visible text*
instead, which survive restyling.

**C. Draft persistence — real vs mocked localStorage.** We use the **real jsdom
localStorage**. The behaviour under test *is* the round-trip — write on save, read and
restore on mount — so the real implementation proves the data actually survives and
repopulates the form the user sees. A `vi.spyOn` mock would only prove a method was
*called* with some key; it cannot prove the value comes back or lands in the right field.
(What jsdom can't prove: real cross-tab `storage` events or browser eviction under quota —
those need a real browser.)

### Q2 — Mocking the session

- **Approach 1 — `vi.mock("next-auth/react")`:** replaces the module so `useSession`
  returns whatever we set. It mocks *only* the hook; the rest of the component tree stays
  real. Fast, no provider needed, and lets each test pick authenticated/null per case.
- **Approach 2 — real `SessionProvider` with a fake session:** exercises the real provider
  + context wiring; only the network/JWT verification is absent.

We use **Approach 1** in `renderWithProviders` — it's the lightest way to drive the auth
state and keeps tests independent. (Caveat specific to CareerHub: the components we test
read identity from a `user` **prop** / `AuthContext`, not `useSession`, so the auth-gate
test plants `careerhub.session` in localStorage rather than leaning on the session mock —
documented in `apply-gate.test.tsx`.)

### Q3 — MSW scope

Requests over the wizard/form lifetime:

| Method | URL pattern | Happy-path response |
|---|---|---|
| `GET` | `${API_BASE}/api/jobs/:id` | 200 + a `JobListingDetailResponse` (apply page hydrates the job) |
| `POST` | `${API_URL}/api/applications` | 201 + `{ id, jobId, email, submittedAt }` (ApplicationForm submit) |
| `GET` | `${API_BASE}/api/jobs` | 200 + empty paged envelope (TanStack Query invalidates `["jobs"]` after submit) |

**What MSW cannot test here:** the **5-step wizard's own submit** — it writes to
`localStorage` (the backend isn't wired yet), so no HTTP request leaves the app for MSW to
intercept. Same for `CloseJobButton`, which calls a **Server Action**, not `fetch`. MSW
intercepts network requests; neither path is a network request, so those are covered by
asserting observable state (confirmation render / "Closed …" state) with the action mocked.

### Q4 — Test naming as specification

- a) *implementation* (asserts internal `currentStep` state) → **"advances to the schedule
  step after completing step 1"**.
- b) *behaviour* — already good.
- c) *implementation* (asserts `localStorage.setItem` was called) → **"keeps the draft so a
  returning user resumes where they left off"**.
- d) *behaviour* — already good.
- e) *implementation* (counts `div`s) → **"announces each step to assistive technology"**
  (if that's the intent) — otherwise delete it.

## README Updates

**1. What makes a test high-value here.** I prioritised the flows where a regression
silently costs a candidate their application: step gating, Back-preserves-values, and the
submit success/error paths. I deliberately did **not** test class names or DOM structure —
they change on any restyle and assert nothing the user perceives.

**2. Session mocking approach.** `vi.mock("next-auth/react")` (Approach 1), set per render
by `renderWithProviders`. It verifies the app behaves correctly for a given auth state; it
does **not** verify real JWT/cookie validation (out of scope for component tests). Because
the tested components actually use `AuthContext`, the gate test plants the localStorage
session — a faithful test of the real mechanism.

**3. The localStorage question.** Real jsdom localStorage (no spy). It proves the
write→reload→restore round-trip actually repopulates the visible form; a spy would only
prove a setter was called. jsdom can't prove real cross-tab events or quota eviction.

**4. One test that surprised me.** The wizard "advance to step 2" test was intermittently
failing only under full-suite load. The failing test told me the component's `Next`
handler validates **asynchronously** and updates the step **after** the `await` — so the
re-render lands outside Testing Library's `act()` window and a bare assertion can race it.
The fix wasn't in the component (its behaviour is correct in a browser) but in the test: a
`clickNext` helper that flushes the async continuation inside `act()` before asserting.
That was a gap in my understanding of how async event handlers interact with `act`, not a
product bug.

---

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

---

# Assignment 3.1 — Rich UI & Form Patterns

Toasts (sonner), a three-step application **wizard** with localStorage draft
auto-save, `AlertDialog` confirmations for destructive actions, and paired
skeleton/empty states on `/jobs`.

## Part 1 — Written Decisions

### Q1 — Draft persistence strategy

**Storage key.** `careerhub-application-${jobId}`. It is scoped to the **job**,
not the user or a single global key, because a draft is meaningful only in the
context of the role being applied for (the cover letter, the "how did you hear"
answer, etc. are role-specific). Scoping to the job id means:

- A candidate applying to **two jobs at once** gets two independent drafts
  (`careerhub-application-<A>` and `careerhub-application-<B>`) that never clobber
  each other. A single global key like `careerhub-application-draft` would let
  whichever tab saved last overwrite the other job's answers.
- A candidate on a **different device** sees no draft — `localStorage` is
  per-browser/per-device and is not synced. That is acceptable (and expected) for
  a convenience draft; the source of truth for a *submitted* application is the
  server, not the draft. We deliberately do **not** promise cross-device drafts.

We do not add the user id to the key. Drafts live in the candidate's own browser,
so the device already scopes them to that person; adding an id would only help if
two accounts shared one browser profile, which is out of scope.

**When the draft is cleared — every trigger and why:**

| Trigger | Why |
| --- | --- |
| Successful submit | The application is now recorded; keeping the draft would resurrect a "saved draft" banner for an application already sent. |
| "Discard draft" confirmed (Part 4b) | Explicit user intent to throw the work away. |
| (Not on navigation away / refresh) | The opposite of clearing — surviving a refresh is the whole point of the draft. |

**Fields safe to store vs excluded.** Safe: `fullName`, `email`, `phone`,
`coverLetter`, `linkedinUrl`, `source` — all low-sensitivity data the user typed
about themselves for this application. We deliberately **exclude** anything we
don't collect in the wizard and would never want lingering in `localStorage`:
passwords/tokens (never in the form), and any file contents (a CV is a `File`
object — not serialisable and potentially large/sensitive, so it is never written
to `localStorage`). National ID numbers are also kept out of this wizard for the
same reason.

### Q2 — The skeleton loader contract

- **"Matching dimensions"** means the skeleton occupies the *same box* the real
  `JobCard` will: same overall **height** (`h-full` in the same grid cell), same
  **padding** (`p-5`), same **border-radius/border**, and bars whose
  heights/widths approximate the real text lines (badge row, title ~¾ width,
  company line ~½, salary, footer). When the data swaps in, nothing reflows →
  **no cumulative layout shift**.
- If the filter returns **3** jobs but the skeleton showed **6**, the user sees 6
  placeholders collapse to 3 — a jarning shrink that reads as "results
  disappeared". The skeleton count is a **loading-time guess about an as-yet
  unknown result count**; you cannot know the real count until the fetch
  resolves. The correct number is "a plausible first screen" (6 here) — not the
  real count, which is unknowable during loading. Once data arrives the skeleton
  is replaced wholesale, so a mismatch only ever flickers for one frame.
- **Paired component pattern:** `JobCard` and `JobCardSkeleton` live side by side
  and are changed together. If one drifts — e.g. JobCard gains a new footer row
  but the skeleton doesn't — the skeleton stops matching dimensions and layout
  shift returns. Pairing is a maintenance contract: edit the card, edit its
  skeleton in the same commit.

### Q3 — AlertDialog vs the alternatives

- **Closing a job** → `AlertDialog`. It is destructive and irreversible
  (removed from the public board), so it warrants a modal that traps focus and
  cannot be dismissed by an accidental outside click.
- **Discarding a draft** → `AlertDialog`. Also destructive ("permanently
  deleted"). Same reasoning. A regular `Dialog` is for non-critical content you
  can click away from; an inline confirm is for low-stakes, reversible toggles —
  neither fits a permanent delete.
- **The Server-Action problem.** Closing a job is a Server Action driven by
  `useActionState` on a `<form>`. `AlertDialog` renders its content — including
  `AlertDialogAction` — in a **Radix portal at the end of `<body>`**, i.e.
  *outside* the `<form>`. A `type="submit"` button in a portal is not associated
  with any form, so clicking it **does nothing** — the form never submits.
  **Solution (chosen):** keep the Server Action, control the dialog's open state
  with `useState`, and on confirm call the action **programmatically** inside
  `useTransition` (`startTransition(() => formAction(fd))`), reading the result
  and firing a toast. The action is invoked by code, not by an in-portal submit,
  so the portal boundary is irrelevant. See "Solving AlertDialog with a Server
  Action" below.

### Q4 — Empty state taxonomy

- **Two different states.** "The database has no jobs at all" is a *system*
  state — there is nothing the user can do, so offering a "clear filters" button
  would be a lie (clearing filters reveals nothing). "Your filters returned no
  results" is a *user* state — the data exists, their query hid it, so the
  correct action is **"Clear all filters"** to get back to the full list.
- **Where it's decided.** Server-side, **after the fetch**, in `/jobs`
  `getJobs()`. We compute the **unfiltered** total and the **filtered** length
  from the same payload. `filteredCount === 0 && unfilteredCount === 0` →
  *DB-empty* state (no action). `filteredCount === 0 && unfilteredCount > 0` →
  *filtered-out* state (Clear-filters button). It must be server-side because
  only the server fetch knows the unfiltered total; the client only ever sees the
  already-filtered list.

## README Updates (required)

### Draft storage key decision

Scoped to `${jobId}` so simultaneous applications to different jobs keep separate
drafts. A single `careerhub-application-draft` key would mean the second job's
auto-save overwrites the first — the candidate switches tabs and finds someone
else's cover letter. **If the job's requirements change while a draft is saved:**
the draft only stores the candidate's *answers*, not the job's fields, so a
changed job description doesn't corrupt the draft — but the restored answers might
no longer be appropriate. We surface the restore explicitly (a dismissible
"Draft restored" banner) precisely so the candidate re-reads the now-current
listing before submitting, rather than silently sending stale answers.

### Solving AlertDialog with a Server Action

I chose **keep the Server Action + `useTransition`** (over converting to a client
`useMutation`). Why: the existing `closeJobListing` already does the PATCH,
`revalidateTag("jobs")` cross-route cache invalidation, and returns a typed
result — rewriting it as a client mutation would duplicate all of that and lose
the tag revalidation that refreshes both `/dashboard` and `/jobs`. The problem
was that `AlertDialogAction` renders in a **portal outside the `<form>`**, so a
`type="submit"` inside it is attached to no form and does nothing. The fix is to
not rely on form submission at all: dialog open state is `useState`, and on
confirm I build a `FormData`, call the action inside `startTransition`, `await`
its result, then fire a sonner success/error toast and close the dialog.
`isPending` from `useTransition` drives the button's loading state.

### The Back button and validation

**Back skips validation on purpose.** Going back is a non-destructive navigation
to data the user already saw; re-validating would block them from returning to
fix an *earlier* field because a *later*, half-filled field is invalid. Scenario:
a candidate on Step 2 realises they typed the wrong email in Step 1. They've also
started a LinkedIn URL but not finished it (currently invalid). If Back
re-validated Step 2, they'd be trapped on Step 2 — unable to reach the email field
they need to fix — by an error on a field they didn't even want to submit yet.
Back must always go back.

### Skeleton count justification

**6 skeletons.** It fills the first two rows of the 3-column grid — a plausible
"first screen" of results without pretending to know the real count (unknowable
mid-fetch). **Too few** (e.g. 1–2) signals "almost no jobs" and under-fills the
viewport, so the page looks broken/empty while loading. **Too many** (e.g. 24)
implies a huge result set and causes a bigger collapse when fewer real cards
arrive, plus more layout to paint for nothing. 6 is the balance between filling
the fold and minimising the swap-in delta.

### Empty state taxonomy

Distinguished **server-side in `getJobs()`** by comparing the unfiltered total to
the filtered length (see Q4). `/jobs` receives both counts and renders either the
no-action *"No jobs are currently listed."* state or the *"No jobs match your
search."* state with a `<ClearFiltersButton/>` that resets every nuqs param. It's
server-side because the unfiltered total is only known to the server fetch.

## Stretch goals

- **A — Cross-tab draft sync:** the wizard listens for the `window` `storage`
  event and updates its "draft restored" banner/values when another tab edits the
  same `careerhub-application-${jobId}` key. The `storage` event fires on *other*
  tabs of the same origin when `localStorage` changes — never in the tab that made
  the change (that tab already has the value), which is why a same-tab save
  doesn't double-handle.
- **B — Animated step transitions:** plain CSS `transform`/`transition` on an
  `overflow-hidden` container; a `direction` state (set by Next/Back) picks
  slide-from-right vs slide-from-left.
- **C — LinkedIn URL live preview:** best-effort preview from the URL slug with an
  `<img onError>` fallback. `onError` on an `<img>` fires when the resource fails
  to load; we use it to hide the broken avatar and fall back to initials, since
  LinkedIn exposes no public profile API or guaranteed image URL.

## Build gate (Assignment 3.1)

`npx tsc --noEmit` → **0 errors**. `npm run build` → **exit 0**, lint + types
clean. (The only warnings are pre-existing Auth.js/`jose` *Edge-runtime*
warnings about `CompressionStream`, unrelated to this assignment's code.)

```text
> next build
 ✓ Compiled successfully
   Linting and checking validity of types ...
 ✓ Generating static pages (24/24)

Route (app)                                 Size  First Load JS
├ ƒ /jobs                                2.16 kB         114 kB
├ ƒ /jobs/[id]                           35.2 kB         171 kB   ← + ApplicationWizard
├ ƒ /dashboard/listings                  3.65 kB         140 kB
└ ƒ /login                                 165 B         106 kB
ƒ Middleware                             87.5 kB
EXIT=0
```


