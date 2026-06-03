# CareerHub API — Assignment 2.2

Relationships, loading strategies & query optimisation. Builds on Assignment 2.1
(PostgreSQL + EF Core) by replacing the flat `Company` string with real entities
and relationships, and refactoring the read endpoints for efficiency.

## Running it

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
