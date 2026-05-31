# Conference Booking API

A .NET 10 Web API for managing conference room bookings, built with centralised error handling and structured logging.

This project demonstrates clean architectural patterns: thin controllers, custom domain exceptions, a global exception handler that produces standardised RFC 7807 `ProblemDetails` responses, and Serilog for structured request and error logging.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How to Run](#how-to-run)
- [Endpoints](#endpoints)
- [Architecture Overview](#architecture-overview)
- [Error Handling Flow](#error-handling-flow)
- [Reflection](#reflection)
  - [1. Controller Thinning](#1-controller-thinning)
  - [2. Structured Logging](#2-structured-logging)

---

## Features

- RESTful CRUD endpoints for conference room bookings
- Idempotency guard against duplicate bookings (same room + same start time)
- Custom domain exceptions decoupled from the web layer
- Global exception handling via `IExceptionHandler`
- RFC 7807 `ProblemDetails` error responses
- Structured logging with Serilog (console sink)
- Automatic per-request logging with method, path, status code, and duration
- Scalar UI for interactive API exploration

---

## Tech Stack

- **.NET 10** (ASP.NET Core Web API with controllers)
- **Serilog** (`Serilog.AspNetCore`, `Serilog.Sinks.Console`)
- **Scalar** (`Scalar.AspNetCore`) for interactive API documentation
- **OpenAPI** for API specification

---

## Project Structure

```
API/
├── Controllers/
│   └── BookingsController.cs        # Thin controller, throws domain exceptions
├── Data/
│   └── BookingStore.cs              # In-memory booking storage
├── DTOs/
│   ├── CreateBookingRequest.cs      # Incoming booking shape
│   └── BookingResponse.cs           # Outgoing booking shape
├── Exceptions/
│   ├── BookingNotFoundException.cs  # Thrown when a booking ID doesn't exist
│   └── DuplicateBookingException.cs # Thrown when a booking already exists
├── Middleware/
│   └── GlobalExceptionHandler.cs    # Central exception translation
├── Models/
│   └── Booking.cs                   # Domain model
├── Properties/
├── appsettings.json
├── API.csproj
└── Program.cs                       # Composition root + Serilog config
```

---

## How to Run

From the repository root:

```bash
cd API
dotnet restore
dotnet run
```

The terminal will display the local URL (typically `http://localhost:5082`).

Open the Scalar UI to test the API interactively:

```
http://localhost:5082/scalar/v1
```

To stop the server, press `Ctrl+C` in the terminal.

---

## Endpoints

| Method | Route                  | Purpose                  | Success Response | Possible Errors                          |
|--------|------------------------|--------------------------|------------------|------------------------------------------|
| GET    | `/api/Bookings`        | List all bookings        | 200 OK           | —                                        |
| GET    | `/api/Bookings/{id}`   | Get a booking by ID      | 200 OK           | 404 `BookingNotFoundException`           |
| POST   | `/api/Bookings`        | Create a new booking     | 201 Created      | 409 `DuplicateBookingException`          |
| DELETE | `/api/Bookings/{id}`   | Delete a booking by ID   | 204 No Content   | 404 `BookingNotFoundException`           |

### Sample Request — POST /api/Bookings

```json
{
  "room": "Boardroom A",
  "bookedBy": "Skye Senatla",
  "startTime": "2026-06-01T14:00:00",
  "endTime": "2026-06-01T15:00:00"
}
```

### Sample Error Response — 404 Not Found

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Booking with ID 11111111-1111-1111-1111-111111111111 was not found.",
  "instance": "/api/Bookings/11111111-1111-1111-1111-111111111111"
}
```

---

## Architecture Overview

The application is organised in layers, each with a single responsibility:

1. **Controllers** receive HTTP requests and return successful responses. They contain no error-handling logic.
2. **Domain Exceptions** describe what went wrong in business terms, with no knowledge of HTTP.
3. **Global Exception Handler** is the single place where domain exceptions are translated into HTTP responses.
4. **Serilog** observes every request and every exception, producing structured logs ready for production tooling.

This separation means each layer can change independently. The controller doesn't need to know what HTTP status code a `BookingNotFoundException` maps to — that's the handler's job.

---

## Error Handling Flow

When a request fails:

```
Client → Controller → throw DomainException
                          ↓
              GlobalExceptionHandler catches it
                          ↓
              1. Logs the exception (Serilog)
              2. Maps exception type → HTTP status code
              3. Builds RFC 7807 ProblemDetails object
              4. Writes JSON response with correct status
                          ↓
                  Client receives consistent error
```

Mapping rules in the handler:

| Exception                    | HTTP Status                   |
|------------------------------|-------------------------------|
| `BookingNotFoundException`   | 404 Not Found                 |
| `DuplicateBookingException`  | 409 Conflict                  |
| *(any other exception)*      | 500 Internal Server Error     |

---

## Reflection

### 1. Controller Thinning

**Why throwing `BookingNotFoundException` is better than returning `NotFound()` directly in the controller.**

In the previous version of this API, controllers were responsible for two things at once: handling the happy path *and* deciding what to do when something went wrong. Lines like `if (booking == null) return NotFound();` and `if (isDuplicate) return Conflict();` cluttered every endpoint and forced the controller to know about HTTP status codes, error body shapes, and logging.

By throwing a `BookingNotFoundException` instead, the controller declares a **business problem** ("this booking doesn't exist") without prescribing a **transport-layer response** ("send back a 404"). That distinction matters. The controller's job becomes describing the happy path — find the booking, return it — and the `GlobalExceptionHandler` becomes the single place that translates domain failures into HTTP responses.

This delivers several concrete benefits:

- **Consistency.** Every error response across the API now follows the same RFC 7807 `ProblemDetails` shape. Clients can parse errors in a single, predictable way.
- **One place to change.** If I later decide every 404 should include a `traceId` or be reported in a different format, I edit one file (`GlobalExceptionHandler`) instead of every controller in the project.
- **Readable controllers.** Removing the error-handling branches leaves controller methods that read like the actual business intent: a `GET` simply fetches and returns; a `POST` creates and returns the new resource.
- **Reusable domain logic.** Because exceptions don't depend on HTTP, the same domain code could later be reused in a background worker, a CLI, or a different transport layer (gRPC, message queue) without modification.
- **Forced consistency at compile time.** A developer cannot forget to handle a missing booking — the `throw` will propagate automatically. Compare that to manually returning `NotFound()`, which is easy to omit.

In short, throwing exceptions enforces the **single responsibility principle** at the controller level: controllers handle success, the handler handles failure, and exceptions act as the contract between them.

---

### 2. Structured Logging

**Why Serilog's JSON-based structured logging is preferred in production over `Console.WriteLine` string concatenation.**

`Console.WriteLine("User " + userId + " failed login at " + DateTime.Now)` produces a single line of unstructured text. That's fine for a quick local script, but it falls apart the moment the application reaches production scale. Once an API is running across multiple instances and generating millions of log lines per day, plain text becomes a needle-in-a-haystack problem.

Serilog solves this by treating logs as **structured data**, not strings. Each log entry has named fields — timestamp, log level, message template, exception, request path, status code, duration, and any custom properties the developer attaches via `{PropertyName}` placeholders. Those entries can be serialised as JSON and shipped to log aggregation tools (Seq, Elasticsearch, Datadog, Application Insights), where they become queryable in the same way a database row is queryable.

The practical advantages in production are significant:

- **Searchability.** I can ask questions like *"show me every `BookingNotFoundException` from the last hour with response time over 500ms"* and get an instant answer. With plain `Console.WriteLine`, I'd have to grep across log files and parse strings manually.
- **Filtering and aggregation.** Structured logs can be filtered by level (`ERR` vs `INF`), grouped by endpoint, or aggregated to produce metrics like "average 404 rate per endpoint per day." None of this is possible with string concatenation.
- **Context propagation.** With `Enrich.FromLogContext()` and the request logging middleware, every log entry carries the request path, status code, and duration automatically. I never have to remember to include them — they're attached for free.
- **Performance.** Serilog only renders the message template when it's actually written to a sink. With string concatenation, the string is built whether the log is needed or not, which wastes CPU when verbose logging is disabled.
- **Operational visibility.** `UseSerilogRequestLogging()` produces a clean one-line summary per HTTP request that replaces the noisy default ASP.NET Core logs. Combined with the exception logging in `GlobalExceptionHandler`, I get a complete view of what the API is doing and where it's failing — exactly the visibility a real production system needs.

The shift from `Console.WriteLine` to Serilog isn't just a tooling upgrade; it's a change in mindset. Logs become first-class data that supports debugging, monitoring, and analytics, rather than a write-once stream of strings that no one can search effectively after the fact.

---

## Author

Xolisa Matsila