# CareerHub API — Assignment 1.1

Foundational ASP.NET Core Web API for the CareerHub job board, built on **.NET 10**. Exposes a small, read-only HTTP surface over an in-memory collection of job listings. This is the first step toward the full backend that will later be consumed by the React / Next.js frontend.

---

## Architecture choice — Minimal APIs

I chose **Minimal APIs** over the Controller-based MVC pipeline.

**Why:**

- **Scope fits.** The assignment defines exactly two endpoints. Controllers add a base class, a separate file per resource, and attribute-decorated methods — that's ceremony this project hasn't earned yet.
- **Modern default.** Minimal APIs are the lighter, faster-startup option since .NET 6 and have been the .NET template default for a while. Route groups, typed results, parameter binding, and validation have closed most of the historical gaps with Controllers.
- **Native OpenAPI integration.** `Microsoft.AspNetCore.OpenApi` reads the typed `Results<Ok<T>, NotFound>` return signatures and produces accurate schemas in Scalar with zero `[ProducesResponseType]` boilerplate.
- **Encapsulation is still trivial.** Endpoints live in a `MapJobEndpoints` extension method in `Endpoints/JobEndpoints.cs`, so `Program.cs` reads like a wiring file, not a router.

I would revisit this if the surface grew complex model binding requirements, needed extensive filters, or required heavy reuse of action-result conventions.

---

## Project structure

```
CareerHub.Api/
├── Program.cs                        # Composition root — wires services and endpoints
├── Models/
│   └── JobListing.cs                 # Domain record
├── Services/
│   ├── IJobService.cs                # Async read contract
│   └── InMemoryJobService.cs         # Hardcoded in-memory implementation
├── Endpoints/
│   └── JobEndpoints.cs               # MapJobEndpoints extension — all /jobs routes
├── Properties/
│   └── launchSettings.json
├── appsettings.json
├── appsettings.Development.json
└── CareerHub.Api.csproj
```

Data lives behind `IJobService`. Route handlers depend on the abstraction and never see the underlying list, so swapping `InMemoryJobService` for an EF Core / PostgreSQL implementation in a later assignment is a one-line `Program.cs` change.

---

## Endpoints

| Method | Route          | Description                  | Success | Failure        |
| ------ | -------------- | ---------------------------- | ------- | -------------- |
| GET    | `/jobs`        | All job listings             | 200 OK  | —              |
| GET    | `/jobs/{id}`   | A single job by integer ID   | 200 OK  | 404 Not Found  |

Both handlers are `async`. The current `InMemoryJobService` completes synchronously via `Task.FromResult`, but the async signature is enforced now so the contract doesn't change when real I/O (database, HTTP, queue) lands in a later assignment. That is what the brief means by *async by default*.

The `{id:int}` route constraint means a non-integer like `/jobs/abc` is rejected by routing itself (404), without the handler ever running.

---

## Running the project

Requires the **.NET 10 SDK**. Verify with:

```bash
dotnet --version   # should print 10.0.x
```

Then:

```bash
dotnet restore
dotnet run
```

The default launch profile opens Scalar in your browser at:

- **Scalar UI** — `http://localhost:5050/scalar/v1`
- **Raw OpenAPI document** — `http://localhost:5050/openapi/v1.json`

You can also exercise the endpoints directly:

```bash
curl http://localhost:5050/jobs
curl http://localhost:5050/jobs/1
curl -i http://localhost:5050/jobs/999   # expect HTTP/1.1 404
```

---
Note on the package constraint. The brief specifies "no external libraries beyond built-in OpenAPI tooling" but also requires Scalar UI for testing. Scalar.AspNetCore is the package the .NET 10 Web API template uses by default for this purpose; I've kept it as the minimum needed to fulfil the testing-UI requirement.

Note on routing. The brief mentions "attribute routing." In ASP.NET Core that term is associated with Controllers ([HttpGet], [Route]). With Minimal APIs the equivalent is MapGet/MapGroup on the endpoint builder, which I've used here. The brief explicitly permits choosing Minimal APIs, so I've treated "explicit routing" as the underlying intent — each route is declared on its own line with a typed pattern (/jobs, /jobs/{id:int}), no convention-based discovery.

## Packages

Per the brief, only the standard library and native OpenAPI tooling are used:

- `Microsoft.AspNetCore.OpenApi` — built-in OpenAPI document generation.
- `Scalar.AspNetCore` — UI for the generated OpenAPI document. This is the documentation viewer the .NET 10 Web API template ships with (replacing Swashbuckle / Swagger UI).

No EF Core, no third-party validators, no AutoMapper.

---

## Suggested commit history

If you're starting fresh from this scaffold, this is the rough sequence of logical commits the brief asks for:

1. `Setup .NET 10 Web API project`
2. `Add JobListing model`
3. `Add IJobService abstraction and InMemoryJobService`
4. `Implement GET /jobs endpoint`
5. `Implement GET /jobs/{id} with 404 handling`
6. `Wire up Scalar UI and OpenAPI`
7. `Add README`
