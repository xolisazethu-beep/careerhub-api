# CareerHub API — Assignment 2.3 (builds on 2.2)

Repository pattern, dependency injection & layered architecture. Builds on
Assignment 2.2 (relationships + query optimisation) by extracting all business
rules into a **service layer**, isolating every EF Core call behind a
**repository layer**, and reducing controllers to pure HTTP handlers.

> **Assignment 2.3 is documented in [its own section below](#careerhub-api--assignment-23).**
> The 2.2 notes (relationships, N+1, tracking) are kept underneath for history.

## CareerHub API — Assignment 2.3

### Running it

```bash
# 1. PostgreSQL (Docker) — match the connection string in appsettings.json
docker run --name careerhub-postgres -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=CareerHub -p 5432:5432 -d postgres:17

# 2. Restore, build, run (migrations are applied + data seeded on startup)
dotnet restore
dotnet run --project CareerHub.Api.csproj

# 3. Open Scalar:  http://localhost:5080/scalar/v1

# 4. Run the status-transition unit tests (no database needed)
dotnet test Tests/CareerHub.Api.Tests.csproj
```

EF Core command logging is on in Development
(`Microsoft.EntityFrameworkCore.Database.Command: Information` in
`appsettings.Development.json`), so every `INSERT`/`SELECT` prints to the terminal
— that is what the proof steps below rely on.

### Architecture at a glance

```
Controllers/    HTTP only — parse, call one service method, return a result.
Services/       ALL business rules. No EF Core. Throws typed domain exceptions.
Repositories/   The ONLY place that imports Microsoft.EntityFrameworkCore.
Domain/         ApplicationStatusPolicy — the workflow rules, as data.
Infrastructure/ ServiceCollectionExtensions — DI wiring, one method per feature.
Exceptions/     Typed domain exceptions.
Middleware/     GlobalExceptionHandler — maps each exception to a status code.
Tests/          xUnit tests for the transition policy (DB-free).
```

The dependency direction is one-way: **Controller → Service → Repository → EF Core.**
A layer never reaches around the one beneath it.

---

## Part 1 — Architecture decisions

### 1. Boundary decisions — one repository per entity

I used **three focused repositories**: `IJobListingRepository`,
`IApplicationRepository`, and a deliberately tiny `ICompanyRepository`. The
boundary follows the **aggregate that owns the data and the consistency rule**,
not just "a table exists".

When `ApplicationService` must confirm a `JobListing` exists before creating an
`Application`, that query lives in **`IJobListingRepository.ListingExistsAsync`** —
the listing's own repository — because the question *"does this listing exist / is
it still open?"* is a fact about listings, and only the listing repository should
know how listings are stored. `ApplicationService` therefore depends on **two**
repositories (`IApplicationRepository` + `IJobListingRepository`) and composes
them; it does not run the query itself.

**Consequence of the wrong choice.** If I had merged everything into one broad
`ICareerHubRepository`, every service would depend on a class that touches every
table. A change to listing queries would force a recompile and retest of code that
only cares about applications, and the "one class per concern" boundary that makes
the duplicate-application rule unit-testable in isolation would be gone. If I had
instead pushed the existence check into `IApplicationRepository`, that repository
would have to query the `job_listings` table — duplicating knowledge of the listing
schema in two repositories, so a listing-schema change could now break the
application repository.

### 2. Return types — why not `IQueryable<T>`

Returning `IQueryable<T>` from a repository interface means the query has **not run
yet** — it is a lazy expression tree the caller finishes composing. To add `.Where`
or `.ToListAsync` the service must reference `Microsoft.EntityFrameworkCore`, which
**re-imports EF Core into the very layer we are trying to keep persistence-free.**
The abstraction leaks: the "interface implementable without EF Core" requirement
becomes impossible, because `IQueryable` execution semantics (deferred execution,
async materialisation, provider-specific translation) *are* EF Core. The service
could also accidentally trigger N+1 or run a query outside the DbContext's scope.
My repositories therefore return **materialised DTOs / entities** (`List<...>`,
`bool`, a domain entity) — the query has already executed inside the repository.

### 3. Lifetime choices

| Service | Lifetime | Why / what breaks otherwise |
|---|---|---|
| `CareerHubDbContext` | **Scoped** | One unit-of-work per HTTP request. As a Singleton it would be shared across concurrent requests — its change tracker is not thread-safe, so you would get race conditions and cross-request data bleed. As Transient, each injection gets a *different* context, so a repository and the thing that reads its changes wouldn't share a tracker. |
| `JobListingService` | **Scoped** | It depends (transitively) on the Scoped `DbContext`. A Singleton service would capture the first request's context forever (a disposed-context / stale-data bug — and the container refuses to build it, see Part 5). |
| `ApplicationRepository` | **Scoped** | Must share the *same* `DbContext` instance as the rest of the request so a `HasAlreadyApplied` check and the following `Add` see one consistent unit of work. |
| `ApplicationStatusCache` (hypothetical) | **Singleton** | It holds immutable transition rules in memory with no per-request or DB dependency. Scoped/Transient would needlessly rebuild it on every request; and crucially a Singleton **must not** depend on anything Scoped, or it would capture a request-scoped object for the app's lifetime. |

### 4. Status transitions — which layer owns it

The **service layer** owns transition validation, by delegating to
`ApplicationStatusPolicy` (a pure domain rule). It belongs there because a status
change is a *business* decision, and the service is the one place that both knows
the application's current status and is reachable from any caller (HTTP today, a
background job tomorrow).

- **Wrong in the controller:** the rule would only run for HTTP callers. A
  background job or a second controller would silently bypass it, and you could not
  test it without spinning up the web stack. (It also violates Part 4 — controllers
  may not contain business `if` statements.)
- **Wrong in the repository:** the repository's job is persistence. Putting the
  rule there couples a *policy* decision to *storage*, makes it untestable without a
  database, and means swapping EF Core for another store would drag the workflow
  rules along with it.

---

## README updates

### 1. Repository design decisions

Three repositories, drawn on entity/aggregate boundaries (see Part 1.1). I **did**
create a separate `ICompanyRepository`, but kept it intentionally minimal — it
exposes only `CompanyExistsAsync`, because the single use case the system has for a
company is *"a listing cannot be created for a company that does not exist."* There
is no `GetAllCompanies`, no company CRUD, because no current feature needs it
(the assignment's "don't add a method for every conceivable query" rule). If a
company-management feature is added later, the interface grows to match it.

### 2. What the controller lost

| Logic that left the controller | New home | Why that layer |
|---|---|---|
| `AnyAsync` / `FindAsync` existence checks | Repository (`*ExistsAsync`, `HasAlreadyAppliedAsync`) | Data access — the only layer allowed to touch EF Core. |
| "company must exist", "closing date in future", "owner-only update", "no duplicate apply", "listing must be open" | Service (`JobListingService`, `ApplicationService`) | Business rules — reusable, testable without HTTP. |
| Status-transition legality | `Domain/ApplicationStatusPolicy` via the service | A pure domain rule, single source of truth, DB-free. |
| Building & populating `JobListing` / `Application` entities | Service | Constructing a domain entity is a domain concern, not HTTP parsing. |
| `SaveChangesAsync` | Repository write methods | Persistence is internal to the repository; callers never see it. |
| `try/catch` around domain errors → status codes | `GlobalExceptionHandler` | One place maps every typed exception to its HTTP status. |
| Reading the applicant id | Still in the controller (from the JWT) | That *is* an HTTP concern — it's the only thing the action parses. |

Result: every controller action is parse → one service call → return (each ≤ 10 lines).

### 3. Status transition design

The rules are encoded as a **`HashSet` of allowed `(from, to)` tuples** in
`Domain/ApplicationStatusPolicy._allowed` — the workflow expressed as *data*, not
control flow. `IsValidTransition(from, to)` is a one-line set lookup; there is no
`switch` and no `if/else` chain anywhere.

Adding a new valid transition — e.g. **`Offered → Accepted`** — is **one new line**
in `_allowed` (plus the `Accepted` enum member). No service, controller, handler,
or test logic changes, because every consumer asks the *same* `IsValidTransition`
question and the answer is derived from that single set. (The terminal-state check
is likewise derived from `_allowed`, so it updates automatically.)

### 4. Lifetime misconfiguration

To prove build-time validation I temporarily registered `IJobListingService` as a
**Singleton** while it depends on the **Scoped** `IJobListingRepository`. Because
`Program.cs` enables `ValidateOnBuild = true` and `ValidateScopes = true`, the app
**refused to start** and threw at `builder.Build()`:

```
Unhandled exception. System.AggregateException: Some services are not able to be
constructed (Error while validating the service descriptor 'ServiceType:
CareerHub.Api.Services.IJobListingService Lifetime: Singleton ImplementationType:
CareerHub.Api.Services.JobListingService': Cannot consume scoped service
'CareerHub.Api.Repositories.IJobListingRepository' from singleton
'CareerHub.Api.Services.IJobListingService'.)
```

**The fix:** change the registration back to
`services.AddScoped<IJobListingService, JobListingService>();` in
`Infrastructure/ServiceCollectionExtensions.cs`. The app then starts cleanly.

**Why the container forbids it.** A Singleton is created **once** and lives for the
whole application. A Scoped service is meant to live for **one request** (here, one
`DbContext` = one unit of work). If a Singleton captured a Scoped dependency, it
would grab the *first* request's instance and hold it forever — a "captive
dependency". At runtime that disposed/stale `DbContext` would be shared across
every subsequent, concurrent request: race conditions on the non-thread-safe change
tracker, objects from request A leaking into request B, and `ObjectDisposedException`
once the original scope ended. Validating at build time turns that subtle,
load-dependent corruption into an immediate, obvious startup failure.

---

## Proving it works

1. **Layer separation.** `Services/JobListingService.cs` and
   `Services/ApplicationService.cs` contain **no** `using Microsoft.EntityFrameworkCore;`
   (each file says so in a comment). Verify:
   `grep -rn "EntityFrameworkCore" Services/` returns nothing.
2. **Duplicate application.** `POST /api/jobs/{id}/applications` → one `INSERT` in
   the terminal, `201`. Repeat the same call → `409 Duplicate application` and
   **no second INSERT** (the service's `HasAlreadyAppliedAsync` short-circuits).
3. **Status transition.** `PATCH .../applications/{applicantId}/status` with
   `Submitted → Offered` → `422 Invalid status transition`. Walk the valid path
   `Submitted → UnderReview → Shortlisted → Offered`; each succeeds.
4. **Lifetime validation.** See README §4 above — exact error captured and fixed.
5. **Controller line count.** Every action in `JobsController` / `ApplicationsController`
   is ≤ 10 lines (parse → one service call → return).
6. **End-to-end create.** `POST /api/jobs` → one `INSERT`, `201` with body. Then
   create the same listing with a non-existent `CompanyId` → `404`.
7. **Extension-method registration.** `Program.cs` contains **no** `AddScoped` /
   `AddTransient` / `AddSingleton` for any repository or service — only
   `AddPersistence`, `AddJobsFeature`, `AddApplicationsFeature`, `AddAuthFeature`.

### Extra additions (beyond the brief)

- **xUnit test project** (`Tests/`) — 18 tests proving the transition policy is
  correct *and* database-independent (Part 6 requirement #2, demonstrated).
- **`Withdraw` + `GetMine` + status-change** endpoints so the applicant-owns-their-
  own-application and full workflow rules are actually reachable from the API.
- **A pre-closed seed listing** so the "cannot apply to a closed listing" rule is
  demonstrable without waiting for a date to pass.
- **EF command logging** pre-configured in Development for the proof steps.

---

## Assignment 2.2 notes (history)

### Running it

1. Start PostgreSQL (Docker):
   ```bash
   - docker run --name careerhub-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=CareerHub -p 5432:5432 -d postgres:17
   ```
2. Restore and create the schema:
   ```bash

  - dotnet restore
  -  dotnet ef migrations add AddCompanyApplicantAndApplicationRelationships
  - dotnet ef database update
  - dotnet run
   ```
3. Run and open the Scalar UI at http://localhost:5080/scalar/v1


---

## 1. Relationship design decisions

**The relationships.** `Company → JobListing` is one-to-many: a company owns many
listings, each listing belongs to exactly one company (foreign key `CompanyId`).
`JobListing ↔ Applicant` is many-to-many, realised through the explicit join
entity `Application`.

**Delete behaviour (`Company → JobListing`): Restrict.** Deleting a company that
still owns listings is rejected by the database. A company's listings — and the
applications people submitted to them — represent real history that should never
disappear as a silent side effect of removing the company. Restrict forces the
listings to be dealt with explicitly first, so the blast radius of a delete is
always visible. (Cascade would have wiped the entire graph in one statement.)

**Why `Application` cannot be a hidden join table.** A hidden join table holds only
the two foreign keys linking the two sides. But applying for a job is a domain
concept with its own data: a submission date and a status that moves through a
hiring workflow (Submitted → UnderReview → Interview → Offer/Rejected/Withdrawn).
That data has nowhere to live on a hidden table. Modelling `Application` as an
explicit entity also lets us query applications directly, return them in API
responses, and give it a composite primary key `(JobListingId, ApplicantId)` that
makes "one application per applicant per listing" a database guarantee.

---

## 2. The N+1 problem

**Before.** With query logging on (`LogTo` in the DbContext) and the listing
endpoint loading each listing's `Company` lazily/per-row, calling `GET /api/jobs`
with 5 listings produced **6 SQL statements**: one to fetch the listings, then one
extra `SELECT` per listing to fetch its company. That is the N+1 pattern — 1 + N.

**After.** Projecting with `Select` (joining to `companies` for just the name)
produced **exactly one SQL statement** containing a JOIN, regardless of how many
listings are returned.

**Why it is dangerous in production even though it "works".** With 5 seed rows the
extra queries are invisible — the endpoint feels instant. With 5,000 real rows it
becomes 5,001 round-trips to the database for a single request. Each round-trip
adds latency and consumes a connection from the pool; under concurrent load the
pool is exhausted and the API times out. The bug scales with data volume, so it
passes every test in development and only surfaces in production.

---

## 3. Read vs write queries

A GET endpoint that does not call `SaveChangesAsync` uses `AsNoTracking()`: EF Core
does not snapshot the loaded entities, so it spends no CPU or memory watching them
for changes. A write operation omits `AsNoTracking()` so the change tracker can
detect mutations and generate the correct `UPDATE` when `SaveChangesAsync` runs.

**Silent data-loss scenario.** Suppose an "update application status" handler loads
the application with `AsNoTracking()`, sets `Status = Interview`, and calls
`SaveChangesAsync()`. Because the entity was never tracked, the change tracker sees
nothing to save — `SaveChangesAsync` returns 0 rows affected and **no error is
thrown**. The API responds 200 OK, the developer believes the status changed, but
the database still says `Submitted`. The wrong setting on a write turns a missing
update into a silent, successful-looking no-op.
