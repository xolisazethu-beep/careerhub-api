# CareerHub Frontend

The first interactive slice of the CareerHub frontend: a job-listings browser built with
**Next.js 15 (App Router)**, **React 19**, **TypeScript (strict)** and **Tailwind CSS v4**.
Components are built against static data that exactly mirrors `GET /api/v1/jobs`, so that when
the live API lands in a later assignment, only the data source changes — the components do not.

A signed-in experience (sign in / sign up / forgot password), search, filtering, sorting,
saving jobs and applying are layered on top as enhancements.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build — must be clean (see "Gate" below)
npm start        # serve the production build
```

Requires Node 18.18+ (developed on Node 22).

### A note on fonts

The fonts (Inter + Plus Jakarta Sans) are **self-hosted** via `next/font/local` from
`src/fonts/*.woff2` rather than fetched from Google Fonts. This keeps builds fully offline,
avoids a third-party request on every page load, and sidesteps the GDPR concerns of Google
Fonts. The pattern is identical to `next/font/google` — only the source of the font file
differs.

---

## Part 1 — Written Decisions

### 1. Lifting state up — the architectural argument

**What breaks if `JobList` owns `selectedId` and `Home` needs the selected title in a summary
panel above the list.** React state flows in exactly one direction: down, through props. A
parent can read and pass its own state to children; a child cannot hand its state back up for
the parent to render. The summary panel lives in `Home`. The selection lives (in this broken
design) in `JobList`, which is `Home`'s child. So `Home` has no way to read `selectedId` — the
panel literally cannot know which job is selected. The only "fixes" available from that broken
position are both wrong: duplicate the selection into a second `useState` in `Home` (now two
sources of truth that drift out of sync the moment one updates without the other), or pass a
callback down into `JobList` so it can report selection back up — which is just lifting the
state to `Home` the long way around. Storing it in `Home` from the start removes the problem.

**Why the nearest-common-ancestor rule produces the correct answer in every case.** State
belongs in the lowest component that is an ancestor of *every* component that needs to read or
set it. Here the consumers are the summary panel (rendered by `Home`) and the `JobCard`s
(rendered by `JobList`, which is rendered by `Home`). The lowest node that sits above both is
`Home`. The rule is not a heuristic — it falls out of the data-flow model: the only component
that can distribute a single value to a set of consumers via props is a common ancestor of all
of them, and choosing the *nearest* one keeps the value from being threaded through more layers
than necessary. Any node lower than the common ancestor cannot reach all consumers; any node
higher works but drills props further than needed.

**Data flow when a `JobCard` is clicked and the panel must update.** Events flow up via
callbacks; state and data flow down via props:

```
JobCard onClick
  -> calls onSelect(job.id)          // callback passed down: Home -> JobList -> JobCard
  -> Home's handleSelect runs        // setSelectedId(id)  (or null if re-clicking)
  -> React re-renders Home
  -> Home recomputes selectedJob
  -> Home passes selectedId down to JobList -> each JobCard's isSelected
  -> Home renders <SummaryPanel job={selectedJob} />
```

One piece of state, owned by `Home`, drives both the highlighted card and the summary panel in
a single render pass. They can never disagree because they read the same source.

### 2. The re-render cycle

The colleague's claim — that `setSelectedId` re-renders all four `JobCard`s even when one
card's selection actually changes — is **correct as a description of React's default
behaviour**, but the implication that this is wasteful is not.

**What React does immediately after `setSelectedId`.** It marks the owning component (`Home`)
as needing to update and schedules a render. On the next tick it re-runs `Home`'s function,
which produces a new element tree. Because `Home` renders `JobList`, and `JobList` maps over
`jobs` to render `JobCard`s, the render walks down through all of them.

**Why a `JobCard` whose props did not change still re-renders.** By default React re-runs a
child's render function whenever its parent re-renders — it does **not** compare the child's
props first. Prop equality only enters the picture if you wrap the child in `React.memo`, which
adds a shallow props comparison and lets the child bail out. Without that, "this card's props
are identical" does not stop the re-render; the function runs again regardless.

**What React 19 introduces to reduce the cost.** The **React Compiler** automatically memoizes
components and computed values at build time. It inserts the equivalent of `useMemo` /
`useCallback` / `React.memo` for you, so components whose inputs are unchanged skip re-rendering
without any hand-written memoization. The default "everything re-renders" cost is paid back
automatically.

**Why re-renders are not DOM updates, and why that matters.** A re-render only re-runs a
function and returns a new *virtual* element tree. React then **diffs** that tree against the
previous one and writes to the real DOM only where the output actually differs. Three cards
whose rendered output is byte-for-byte identical produce **zero** DOM mutations. This matters
because the expensive work — layout, paint, reflow — happens on DOM writes, not on re-running a
function that returns the same elements. So "all four cards re-rendered" is usually a non-event
for performance; the thing to watch is DOM mutations, and React already minimizes those.

### 3. Union types versus `string`

`employmentType` is typed `"FullTime" | "PartTime" | "Contract" | "Internship"`, not `string`.

**Scenario A — the API adds a new type ("Freelance") and the frontend is not yet updated.**
The badge style map `EMPLOYMENT_TYPE_STYLES` is declared `Record<EmploymentType, …>`. When the
regenerated TypeScript client widens the union to include `"Freelance"`, that `Record` is
suddenly missing a key, and the project fails to compile with
`Property 'Freelance' is missing in type '{ FullTime: …; PartTime: …; … }'`. The error appears
**in the editor and at build time**, pointing straight at the map that needs a new entry. Had
`employmentType` been `string`, the union never changes, nothing flags, the `"Freelance"` value
flows straight through, and `EMPLOYMENT_TYPE_STYLES[value]` evaluates to `undefined` — then
reading `.badge` throws `Cannot read properties of undefined (reading 'badge')` **at runtime in
the user's browser**, discovered only when a Freelance listing happens to load.

**Scenario B — a typo in the hardcoded data.** Writing `employmentType: "Fulltime"` (wrong
casing) in `page.tsx`. With the union, the editor immediately underlines it:
`Type '"Fulltime"' is not assignable to type 'EmploymentType'` — caught **as you type**, before
saving. With `string`, the typo is accepted silently; the badge lookup returns `undefined`, and
the bug only surfaces when that card renders with a missing badge or a runtime crash.

In both cases the union moves the failure from **runtime, in production** to **compile time, in
the editor** — the correct, cheapest place to catch it.

### 4. The `&&` rendering trap

`{job.applicantCount && <p>{job.applicantCount} applicants</p>}` renders a literal **0** when
`applicantCount` is `0`, even though `0` is falsy.

The reason is two facts combined. First, JavaScript's `&&` does not return a boolean — it
returns one of its **operands**. When the left side is falsy, `&&` short-circuits and returns
that **left value unchanged**: `0 && <p/>` evaluates to `0`, not `false`. Second, React renders
numbers and strings as text nodes; it skips rendering only for `true`, `false`, `null` and
`undefined`. So React is handed the number `0`, and faithfully prints "0" into the DOM. The trap
is the mismatch between "falsy" (a truthiness test) and "what `&&` returns" (the actual value).

Both correct solutions force the left side to be a real boolean (which React then ignores):

```tsx
// 1. Boolean comparison
{job.applicantCount > 0 && <p>{job.applicantCount} applicants</p>}

// 2. Ternary returning null
{job.applicantCount > 0 ? <p>{job.applicantCount} applicants</p> : null}
```

**I prefer the ternary returning `null`** (and that is what `JobCard.tsx` uses). It states the
real business rule — *show this only when there is more than zero* — rather than relying on
truthiness, it returns `null` explicitly (which React is documented to ignore), and it will not
regress if the field's type ever changes. The `> 0 &&` form is equally safe; the bare
`count && …` form is the bug.

---

## README Updates

### 1. Why static data first

Building against hardcoded data first means every UI decision — how a card looks, what a
selected state communicates, how an empty list reads — gets made on its own, free of network
latency, auth tokens, loading and error states, and API downtime. You are designing the
*shape* of the interface, not debugging fetch calls. Because the static data is defined to be
the **exact shape** the API returns, swapping in the real endpoint later changes only where the
array comes from; the components that consume it do not change at all.

A component is **data-source agnostic** when it neither knows nor cares where its data came
from. `JobCard` and `JobList` receive `JobListing` objects as props and render them. They have
no idea whether those objects were typed by hand in `page.tsx`, pulled from `localStorage`, or
fetched from `GET /api/v1/jobs`. The day the fetch lands, `page.tsx` replaces its hardcoded
array with the API response and passes it down through the same props. If a component had to
change when the data source changed, the architecture would be wrong — the component would be
coupled to the transport, not just the shape.

### 2. Type contract with the backend

`src/types/index.ts`'s `JobListing` interface is the frontend half of a contract whose
authoritative half is `JobListingResponse.cs` on the backend. They describe the same records.
The intended workflow is that a regenerated TypeScript client keeps `JobListing` in lockstep
with the C# response DTO.

**What happens, specifically, when a backend developer renames `salaryMin` to `minimumSalary`
and the frontend has not been updated:**

- *If the client is regenerated (the contract is honoured):* `JobListing.salaryMin` becomes
  `JobListing.minimumSalary`. Every line that still reads `job.salaryMin` — the
  `formatSalaryRange(job.salaryMin, job.salaryMax)` calls in `JobCard.tsx` and
  `SummaryPanel.tsx` — fails to compile with `Property 'salaryMin' does not exist on type
  'JobListing'`. `npm run build` **breaks loudly**, before anything ships. You fix the
  references and move on. This is the correct failure mode.
- *If the interface is left stale (the contract is broken):* TypeScript still believes the
  field is `salaryMin`, so nothing complains. At runtime the API delivers `minimumSalary`,
  `job.salaryMin` is `undefined`, and `formatSalaryRange(undefined, …)` renders garbage like
  `RNaN` to real users. A silent visual bug instead of a build error.

The whole point of the typed contract is to turn a backend rename into a **compile error**
rather than an `RNaN` in production.

### 3. Component responsibility table

| Component       | Owns state                                                                                              | Receives via props                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Home` (`page`) | `selectedId`, `savedIds`, `applyingId`, `query`, `typeFilter`, `sort`, `activeOnly` (all `useState`)    | — (top of this tree)                                                               |
| `JobList`       | none                                                                                                    | `jobs`, `selectedId`, `onSelect`, `savedIds`, `onToggleSave`, `onApply`            |
| `JobCard`       | none                                                                                                    | `job`, `isSelected`, `onSelect`, `isSaved`, `onToggleSave`, `onApply`              |

`JobList` and `JobCard` are fully controlled — they hold no state and render purely from props,
which is what makes them data-source agnostic. All selection, saving, filtering and apply state
is owned by `Home`, the nearest common ancestor of everything that reads it.

### 4. Gate

`npm run build` completes with **zero TypeScript errors and zero ESLint errors**. Verified
output:

```
> careerhub-frontend@0.1.0 build
> next build

   ▲ Next.js 15.5.19

   Creating an optimized production build ...
 ✓ Compiled successfully in 10.2s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (7/7)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    5.87 kB         108 kB
├ ○ /_not-found                            993 B         103 kB
├ ○ /forgot-password                     2.59 kB         108 kB
├ ○ /login                               3.04 kB         109 kB
└ ○ /signup                              3.14 kB         109 kB
+ First Load JS shared by all             102 kB

○  (Static)  prerendered as static content
```

`npx next lint` → `✔ No ESLint warnings or errors`.

> Security note: the project pins `next@15.5.19` to clear the critical advisory present in
> earlier 15.3.x releases. A remaining moderate `npm audit` finding is a transitive `postcss`
> issue inside Next's own bundle, only resolvable by downgrading Next several major versions, so
> it is left as-is.

---

## What was required vs. what was added

**Required (the assignment):** typed `JobListing` interface, `JobCard` (derived badge colour,
formatted rand salary, calculated relative date, closed label, applicant count that never shows
0, selection state), `JobList` (responsive grid, id-based keys, result count, domain-specific
empty state), and a `Home` page with hardcoded data, selection state, and a summary panel that
appears and disappears (truly removed from the DOM).

**Added beyond the brief:** authentication (sign in, sign up, forgot password with a mock
provider whose public shape matches a future real API), a search box, employment-type filter
chips, sorting, "open roles only" toggle, save / bookmark with auth gating, an apply flow with a
confirmation modal, toast notifications, a sticky auth-aware navbar with a user menu, a footer,
self-hosted fonts, full keyboard operability, visible focus rings, and `prefers-reduced-motion`
support. See `FEATURES.pdf` for a full breakdown.

---

## Project structure

```
src/
  app/
    layout.tsx            # fonts, providers, navbar + footer shell
    page.tsx              # Home — hardcoded data, selection, filters (use client)
    globals.css           # @import "tailwindcss" + theme tokens
    login/page.tsx
    signup/page.tsx
    forgot-password/page.tsx
  components/
    JobCard.tsx           # typed props in-file, derived badge, no 0 leak
    JobList.tsx           # grid, id keys, count, empty state
    SummaryPanel.tsx
    FilterBar.tsx
    ApplyModal.tsx
    Navbar.tsx  Footer.tsx  AuthShell.tsx  AuthFields.tsx
  context/
    AuthContext.tsx       # mock auth, API-shaped surface
    ToastContext.tsx
  lib/
    format.ts             # salary range + relative date
    employmentType.ts     # union-keyed badge/label map
  types/
    index.ts              # JobListing + EmploymentType — the contract
  fonts/                  # self-hosted woff2
```
