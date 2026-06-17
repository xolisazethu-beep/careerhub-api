# Assignment 1.2 — Setup & Walkthrough

This file explains, in plain language, **what Assignment 1.2 asked for, what I changed
in the CareerHub frontend to satisfy it, and where to look for each piece.** It is the
guided tour; the formal written answers live in the `Assignment 1.2` section of
`README.md`.

---

## The one-sentence goal

Take the *working* job-listings page from Assignment 1.1 and make it *production-grade* —
polished, fully responsive, dark-mode-aware, and able to remember the user's selected job
across refreshes — **without changing any component logic from 1.1.** Only styling, one
new component, two persistence effects, and the theme plumbing were added.

---

## How to run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # must be clean — zero TS + zero ESLint errors (the "gate")
```

To see the new behaviour:

- **Dark mode** — click the sun/moon toggle in the top-right of the header. Everything
  switches. Refresh — it's remembered. Open a new tab — still remembered.
- **Persisted selection** — click a job card (it highlights and a summary panel appears),
  then refresh the page. The same job is still selected. Open DevTools →
  Application → Session Storage to watch the `careerhub:selectedJobId` key appear and
  disappear.
- **Badges** — every card shows a colour-coded employment-type badge; the one closed
  listing (Luno DevOps) also shows a "No longer accepting applications" badge.

---

## What changed, part by part

### Part 2 — shadcn/ui setup (was already in place, one break fixed)

shadcn/ui was already installed in the project. Its three artefacts exist:

- `components.json` — the shadcn config at the project root.
- `src/lib/utils.ts` — exports `cn`, the class-composition helper.
- `src/components/ui/badge.tsx` — the owned-in-tree `Badge` + `badgeVariants`.

The important idea: **a shadcn component is copied into my repo, not imported from a
package.** Once it's in `src/`, it's my code. That's why a shadcn upgrade can never break
my build out from under me (explained fully in README Part 1, Q1).

`globals.css` already had the line that makes class-based dark mode work:

```css
@custom-variant dark (&:is(.dark *));
```

Without this line, flipping a `.dark` class on `<html>` would change nothing — Tailwind
v4 wouldn't know to wire `dark:` utilities to that class.

### Part 3 — `JobStatusBadge` (was already in place)

`src/components/JobStatusBadge.tsx` holds the **single authoritative source** for two
visual signals:

- **`EmploymentTypeBadge`** — colour comes entirely from a
  `Record<EmploymentType, string>` map (`EMPLOYMENT_TYPE_BADGE`), defined once. FullTime =
  emerald, PartTime = sky, Contract = amber, Internship = violet. The call site never
  decides colours — it just passes the typed `employmentType`.
- **`ActiveStatusBadge`** — renders **only** when `isActive` is `false`; otherwise it
  returns `null` so there is no hidden element in the DOM.

`JobCard` uses both. No prop is typed `any`.

### Part 4 — Tailwind design pass (was already in place)

`JobCard.tsx` composes its entire surface with `cn(...)` — **no template literals** — and
every colour class has a `dark:` variant. The **selected** state is distinct in both
light and dark (brand border + ring + shadow + an accent rail); the **expired** state is
shown at the card level (dashed border, muted background, dimmed content), not just via
the badge. `JobList`'s result count and empty-state message are dark-readable too.

### Part 5 — `useEffect` session persistence (**newly added**)

This is the main logic I added, in `src/app/page.tsx`. Two **separate** effects:

```ts
// EFFECT 1 — restore on mount only ( [] )
useEffect(() => {
  const stored = sessionStorage.getItem(SELECTED_JOB_KEY);
  if (stored && JOBS.some((job) => job.id === stored)) setSelectedId(stored);
}, []);

// EFFECT 2 — persist on every selection change ( [selectedId] )
useEffect(() => {
  if (selectedId) sessionStorage.setItem(SELECTED_JOB_KEY, selectedId);
  else sessionStorage.removeItem(SELECTED_JOB_KEY);
}, [selectedId]);
```

They **must** stay separate: one is "run once on mount", the other is "run on every
change". A single effect can't be both. Effect 1 ignores a stale id (a stored job that no
longer exists). Effect 2 *removes* the key when nothing is selected, so it never leaves a
stale value behind.

Why an effect and not the click handler? Because a **refresh has no click** — only an
effect bound to the *value* `selectedId` keeps storage correct no matter how the
selection changed (click, keyboard, restore, or the panel's clear button). Full argument
in README Part 1, Q3.

### Part 6 — dark mode toggle (**newly added / completed**)

- **`src/components/ThemeToggle.tsx`** — toggles `.dark` on `document.documentElement`,
  persists the choice to `localStorage`, and on first mount reads the stored preference
  (or the OS preference via `window.matchMedia` when none is stored) and applies it. Its
  `isDark` state only drives the button's own icon/label/`aria-label` — it is **not** what
  makes the app dark. The real source of truth is the `.dark` class on `<html>`.
- **`src/app/layout.tsx`** — I added a tiny inline boot script in `<head>` that applies
  the theme *before first paint*, so there's no flash of the wrong theme on load, plus
  `suppressHydrationWarning` on `<html>` because that script mutates the class before React
  hydrates. The toggle and app name sit in the header (`Navbar`, rendered from the layout).
- Dark variants were added to the page hero text, the `Navbar`, the `Footer`, and the
  `FilterBar` so every surface switches cleanly.

---

## One bug I found and fixed along the way

`FilterBar.tsx` was importing `EMPLOYMENT_TYPE_STYLES` from `@/lib/employmentType`, but
that module had been refactored to export `EMPLOYMENT_TYPE_LABELS` instead. **The build
was failing.** I repointed `FilterBar` to `EMPLOYMENT_TYPE_LABELS` and added its dark-mode
classes at the same time. The build is now clean.

---

## The gate (proof it's clean)

```
 ✓ Compiled successfully
   Linting and checking validity of types ...
 ✓ Generating static pages (7/7)
```

`npm run build` → zero TypeScript errors, zero ESLint warnings.
`npx next lint` → `✔ No ESLint warnings or errors`.

---

## Where to look — file map for 1.2

| Concern                         | File                                   |
| ------------------------------- | -------------------------------------- |
| `cn` helper                     | `src/lib/utils.ts`                     |
| shadcn Badge (owned in-tree)    | `src/components/ui/badge.tsx`          |
| Employment-type + closed badges | `src/components/JobStatusBadge.tsx`    |
| Card styling (cn + dark)        | `src/components/JobCard.tsx`           |
| Session persistence effects     | `src/app/page.tsx`                     |
| Theme toggle                    | `src/components/ThemeToggle.tsx`       |
| No-flash boot script + header   | `src/app/layout.tsx`                   |
| Class-based dark mode directive | `src/app/globals.css`                  |
| Written answers + gate output   | `README.md` (Assignment 1.2 section)   |
