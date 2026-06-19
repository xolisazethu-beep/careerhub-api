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

# Assignment 1.2 — Styling, Badges & Effects

Assignment 1.1 produced a working component tree. Assignment 1.2 makes it
*production-grade*: shadcn/ui is installed and owned in-tree, employment-type and
expiry signals are unified in one `JobStatusBadge`, every template literal in the card
is replaced with `cn`, the page remembers the user's selected job across refreshes via
`useEffect` + `sessionStorage`, and a class-based dark mode (with OS-preference fallback
and no flash on load) is wired through the whole app. **No component logic from 1.1 was
changed** — only styling, the badge extraction, the two persistence effects, and the
theme plumbing were added.

## Part 1 — Written Decisions

### 1. The shadcn/ui ownership model

The `@mui/material` disaster — a major version renaming `variant` to `intent` and breaking
the build in thirty places — **cannot happen with a shadcn/ui component**, because shadcn/ui
is not a dependency you import from. It is a generator.

- **Where the source lives after installation.** When I ran the Badge "install", shadcn/ui
  *copied* `badge.tsx` into `src/components/ui/badge.tsx` — a real file inside my repository,
  committed to my git history. There is no `@shadcn/badge` package in `node_modules`; nothing
  in `package.json` points at a shadcn component. The only runtime dependencies the Badge
  pulls in are the small, stable primitives it happens to use (`class-variance-authority`,
  `@radix-ui/react-slot`, `clsx`, `tailwind-merge`).
- **Who is responsible for it.** I am. The moment the file lands in `src/`, it is *my* code —
  identical in status to a component I hand-wrote. shadcn/ui has no further claim on it and
  cannot reach in and change it.
- **What the upgrade path actually is.** When shadcn/ui ships an improved Badge, *nothing
  happens to my project* until I choose to act. There is no transitive version bump, no
  `npm update` that can rewrite my component. To adopt the new version I would re-run the add
  command and review the diff against my file — a deliberate, reviewable, opt-in change I make
  on my schedule. A renamed prop could only ever appear in my codebase because **I** typed it
  in, having read the diff. The build can never break out from under me because there is no
  upstream package with the power to break it.

### 2. Why the `cn` utility exists

My `JobCard` composes the card surface from several conditional class groups. The base
includes `bg-white` (and `dark:bg-slate-900`); the **expired** branch adds `bg-slate-50`
(and `dark:bg-slate-900/50`). Both target the **same CSS property: `background-color`.**

With plain string concatenation, an expired card's class attribute ends up containing **both**
`bg-white` and `bg-slate-50`. Tailwind generates each utility as a class of equal specificity,
so CSS cannot use specificity to pick a winner — the one that wins is simply **whichever appears
later in the generated stylesheet**. That order is decided by Tailwind's build, *not* by the
order I wrote the classes in the string. So `"bg-white " + "bg-slate-50"` is unreliable: the
card might render white *or* slate depending on how the utilities happen to be emitted, and that
can silently change between builds.

`tailwind-merge` (inside `cn`) understands that `bg-white` and `bg-slate-50` belong to the same
conflict group and keeps **only the last one passed**, deleting the earlier one from the string
entirely. So `cn("bg-white", isExpired && "bg-slate-50")` produces just `bg-slate-50` for an
expired card and just `bg-white` otherwise — a single, deterministic background that does not
depend on stylesheet source order at all. That is the difference: string concatenation emits a
conflict and hopes; `cn` resolves the conflict before it reaches the DOM.

### 3. The event handler versus `useEffect` argument

Writing the `sessionStorage` call directly inside the click handler works for the case the
teammate tested: a click selects a job and writes storage; a second click deselects and removes
it. But the click handler is only one of several ways `selectedId` can change — and it **cannot
handle the one that matters most: restoring state on mount.**

When the user refreshes the page (or opens the URL in a new tab), there is *no click*. The
component mounts, `selectedId` is read from storage and set programmatically — and any code path
that updates `selectedId` *without going through the click handler* (the restore effect itself,
a "clear selection" button in the summary panel, a future deep-link) would never write to
storage, because the handler is the only thing that does. The handler couples persistence to
*one specific user gesture* instead of to the *state* it is supposed to mirror.

`useEffect(…, [selectedId])` binds persistence to the **value**, not the gesture. However
`selectedId` came to change — click, keyboard, restore, programmatic clear — the effect runs and
storage stays correct. This matters for real users because the whole point of the feature is
that a refresh or a recovered tab brings their selection back; the event-handler approach is
structurally incapable of doing the very thing the feature exists for.

### 4. The source of truth for dark mode

- **What `isDark` in `ThemeToggle` is actually used for.** Purely *presentation of the button
  itself* — choosing the sun-vs-moon icon and the "Light"/"Dark" word, and phrasing the
  `aria-label`. It is a local mirror so the control can describe the current mode. It drives
  **nothing** about how the rest of the app is styled.
- **What the true source of truth is.** The presence or absence of the **`.dark` class on the
  `<html>` element** (`document.documentElement`). Every `dark:` utility in every component reads
  from that one class via the `@custom-variant dark` directive in `globals.css`. The themed UI
  responds to the DOM class, never to React state.
- **What happens if `ThemeToggle` unmounts and remounts after the user enabled dark mode.** The
  app stays dark — correctly — because the `.dark` class lives on `<html>`, which is *outside*
  React's component tree and is unaffected by a component unmounting. On remount, `isDark`
  re-initialises to its default `false`, but the mount effect immediately reads the real source
  of truth (the persisted preference / the existing class) and corrects `isDark` back to `true`,
  so the button's icon and label re-sync to the still-dark page. The brief reset of `isDark`
  never reaches the screen as a theme change, because `isDark` was never what made the page dark
  in the first place. This is exactly *why* the class — not React state — must be the source of
  truth: state is destroyed on unmount; a class on `<html>` survives it.

## Part 2 — shadcn/ui Setup — Proving It Changed

`components.json` (project root), `src/lib/utils.ts` (exports `cn`) and
`src/components/ui/badge.tsx` (exports `Badge` and `badgeVariants`) all exist, and
`globals.css` carries `@custom-variant dark (&:is(.dark *));` to enable class-based dark mode.

The function in `badge.tsx` that maps a `variant` value to a set of Tailwind classes is
**`badgeVariants`**, built with **`cva` (`class-variance-authority`)**. In one sentence: `cva`
takes a base class string plus a map of variant→classes and returns a function that, given props
like `{ variant: "secondary" }`, returns the correct merged class string for that variant.

## Part 3 — JobStatusBadge — Proving It Changed

`src/components/JobStatusBadge.tsx` exports two pieces with one authoritative mapping each:

- **`EmploymentTypeBadge`** — colour derives entirely from `employmentType` via the
  `EMPLOYMENT_TYPE_BADGE` `Record<EmploymentType, string>` map, defined once. All four union
  values render distinct colours: **FullTime → emerald, PartTime → sky, Contract → amber,
  Internship → violet**. The seed data covers all four, so all four colours appear at once.
- **`ActiveStatusBadge`** — returns `null` when `isActive` is `true`, so a still-open listing
  renders **only** its employment-type badge with **no hidden element in the DOM**. When
  `isActive` is `false` (the Luno DevOps listing) it renders a "No longer accepting
  applications" badge beside the type badge.

Both use the shadcn `Badge` (never a `<span>`) and `cn` for class composition; no prop is typed
`any` or `string` where a union is correct (`employmentType: EmploymentType`).

## Part 4 — Tailwind Design Pass — Proving It Changed

`JobCard.tsx` and `JobList.tsx` contain **no template literals** for class composition —
`JobCard` composes its surface entirely with `cn`. Every colour-bearing class in the card has a
`dark:` variant (background, border, text, ring, shadow). The **selected** state is distinct in
both modes (brand border + ring + shadow + accent rail); the **expired** state is communicated
at the *card* level — dashed border, muted surface, reduced opacity — not only through the badge.
`JobList`'s result count and empty state are both dark-readable.

## Part 5 — useEffect Session Persistence — Proving It Changed

`page.tsx` has **two separate effects** (a code comment on each explains its dependency array):

1. `[]` — runs once on mount, restores `selectedId` from `sessionStorage` **only if** the stored
   id still matches a job in the dataset (stale ids are ignored silently).
2. `[selectedId]` — runs on every selection change; writes the id when one is selected, and
   **removes the key entirely** when none is, so no stale value is left behind.

Select a job → refresh → the same job is selected and the summary panel reappears. Deselect →
refresh → nothing is selected and the panel is absent. DevTools → Application → Session Storage
shows `careerhub:selectedJobId` present only while a job is selected.

## Part 6 — Dark Mode Toggle — Proving It Changed

`src/components/ThemeToggle.tsx` toggles the `.dark` class on `document.documentElement`, reads
the stored preference from `localStorage` on first mount (falling back to
`window.matchMedia("(prefers-color-scheme: dark)")` when none is stored), persists every choice,
shows text reflecting the current mode, and carries an `aria-label` describing the *action*
("Switch to dark mode"). It lives in the app **header** (the `Navbar`, rendered from
`layout.tsx`) alongside the application name, and the header has light + dark classes. An inline
boot script in `layout.tsx` applies the theme before first paint, so there is no flash. Toggling
switches every surface — header, page background, summary panel, cards, badges, empty state;
the choice survives refreshes and new tabs; clearing `localStorage` falls back to the OS
preference on next load.

## README Updates

### 1. Component extraction rationale

`JobStatusBadge` is a separate component, not inline logic in `JobCard`, because of the **single
responsibility principle**: a card's job is to lay out a listing, not to *own the definition* of
what colour a "Contract" badge is or how a closed listing reads. Those two visual decisions are
their own responsibility, so they live in their own module with one authoritative mapping each.

Concretely, suppose the employment-type colour scheme changes (say Contract moves from amber to
rose):

- **With the extracted component:** I edit exactly **one** line in the `EMPLOYMENT_TYPE_BADGE`
  map in `JobStatusBadge.tsx`. Every call site — `JobCard`, and any future summary panel or
  search result — updates automatically, because they all ask `JobStatusBadge` for the colour.
- **Without it (inline in `JobCard`):** the colour logic would be duplicated at every place a
  badge is shown. I'd have to find and edit each one, and the first one I missed would render
  the old colour — the classic drift bug that single-responsibility extraction exists to
  prevent.

### 2. The `cn` utility

`cn` runs two libraries in sequence (`src/lib/utils.ts`):

- **`clsx`** flattens conditional inputs — strings, arrays, and objects like
  `{ "border-dashed": !isActive }` — into one space-separated class string, dropping every falsy
  entry. It is purely about *assembling* the string from conditions.
- **`tailwind-merge`** then *de-conflicts* that string: when two utilities target the same CSS
  property, it keeps only the last one.

**The failure mode `tailwind-merge` prevents**, from my `JobCard`: the base classes set
`bg-white`, and the expired branch adds `bg-slate-50` — both set `background-color`. Without
`tailwind-merge` the element carries both classes and the winner is decided by Tailwind's
generated stylesheet order, not my intent, so the expired card's background is unreliable. With
it, `cn` collapses the pair to just `bg-slate-50`, giving a single deterministic background.

### 3. Effect responsibilities table

| Effect                  | Dependency array | Runs when                                                                 |
| ----------------------- | ---------------- | ------------------------------------------------------------------------- |
| Restore selection       | `[]`             | Once, immediately after the first render (mount) — never again.           |
| Persist selection       | `[selectedId]`   | After mount and after every render in which `selectedId` changed value.   |
| *If the two were merged* | `[selectedId]`  | The restore logic would re-run on **every** selection change, not just on mount — re-reading storage and risking overwriting the user's live choice with the persisted one. A single effect cannot be both "once on mount" *and* "on every change"; the two responsibilities need two dependency arrays. |

### 4. Gate

`npm run build` completes with **zero TypeScript errors and zero ESLint errors/warnings**:

```
> careerhub-frontend@0.1.0 build
> next build

   ▲ Next.js 15.5.19

   Creating an optimized production build ...
 ✓ Compiled successfully in 14.6s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (7/7)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      19 kB         121 kB
├ ○ /_not-found                            993 B         103 kB
├ ○ /forgot-password                     2.59 kB         108 kB
├ ○ /login                               3.04 kB         109 kB
└ ○ /signup                              3.14 kB         109 kB
+ First Load JS shared by all             102 kB

○  (Static)  prerendered as static content
```

`npx next lint` → `✔ No ESLint warnings or errors`.

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
confirmation modal, toast notifications, descrption of the role like minimum academic requerements, experience and what you will be doing on the job and tools that you should know, a sticky auth-aware navbar with a user menu, a footer,
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

---

# Assignment 1.3 — Server State & TanStack Query

Assignment 1.2 produced a visually complete app driven by a **hardcoded array** in `page.tsx`.
Assignment 1.3 replaces that array with **live data fetched over HTTP** using **TanStack Query
v5**. The job page now loads real data from a Next.js route handler, shows a structure-matched
skeleton while the request is in flight, renders an error panel with a retry button on failure,
and caches the result in TanStack Query's client store. **No component from 1.1 or 1.2 was
modified** — `JobCard`, `JobList`, `JobStatusBadge`, `ThemeToggle` and `AvailabilityBadge` are
all data-agnostic. The only files that changed are the entry points (`page.tsx`, `layout.tsx`)
plus three new files (`api/jobs/route.ts`, `providers.tsx`, `lib/api.ts`) and the skeleton.

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
