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
