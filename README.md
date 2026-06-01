# ConferenceBookingAPI — Assignment 1.4

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [File Reference](#3-file-reference)
   - [Program.cs](#programcs)
   - [Controllers](#controllers)
   - [DTOs](#dtos)
   - [Data](#data)
   - [Exceptions & Middleware](#exceptions--middleware)
4. [Authentication & Authorization Explained](#4-authentication--authorization-explained)
   - [Stateless Auth: Sessions vs JWTs](#stateless-auth-sessions-vs-jwts)
   - [401 Unauthorized vs 403 Forbidden](#401-unauthorized-vs-403-forbidden)
   - [Token Storage Safety](#token-storage-safety)
5. [Middleware Pipeline Order](#5-middleware-pipeline-order)
6. [Endpoint Reference](#6-endpoint-reference)
7. [Proving It Works — Scalar Walkthrough](#7-proving-it-works--scalar-walkthrough)
   - [Step 1 — Anonymous GET (200 OK)](#step-1--anonymous-get-200-ok)
   - [Step 2 — Unauthenticated POST (401)](#step-2--unauthenticated-post-401)
   - [Step 3 — Login and decode the token](#step-3--login-and-decode-the-token)
   - [Step 4 — Authenticated POST (201 Created)](#step-4--authenticated-post-201-created)
   - [Step 5 — Wrong role DELETE (403 Forbidden)](#step-5--wrong-role-delete-403-forbidden)
   - [Step 6 — GET /api/auth/me](#step-6--get-apiauthme)
8. [Suggested Git Commits](#8-suggested-git-commits)

---

## 1. Project Overview

ConferenceBookingAPI is an ASP.NET Core Web API that manages conference seat bookings.
It was built across Assignments 1.1–1.4 and adds the following in this iteration:

- **CORS** configured to allow a Next.js frontend at `http://localhost:3000`
- **JWT Bearer authentication** — stateless, signed tokens issued at login
- **Role-Based Access Control (RBAC)** — read endpoints are public; write and delete
  endpoints require a valid JWT with the `Employer` role
- **Scalar UI** for interactive API testing directly in the browser

The data layer uses an in-memory `BookingsStore` (a static list) that simulates a
database. Week 2 will replace it with an EF Core `DbContext` backed by a real SQL table.

---

## 2. Project Structure

```
ConferenceBookingAPI/
└── API/
    ├── Controllers/
    │   ├── AuthController.cs         ← Login + /me endpoints
    │   └── BookingsController.cs     ← CRUD endpoints for bookings
    ├── Data/
    │   └── BookingsStore.cs          ← In-memory data store (Week 1 "database")
    ├── DTOs/
    │   ├── BookingResponse.cs        ← Shape returned to callers
    │   ├── CreateBookingRequest.cs   ← Shape expected when creating a booking
    │   ├── LoginRequest.cs           ← Username + Password for login
    │   └── LoginResponse.cs         ← JWT token string returned after login
    ├── Exceptions/                   ← Custom exception types (NotFoundException etc.)
    ├── Middleware/                   ← Global exception handler middleware
    ├── Models/                       ← Domain model classes
    ├── Properties/
    ├── API.csproj
    ├── API.http
    ├── appsettings.Development.json  ← Jwt:SecretKey lives here
    ├── appsettings.json
    └── Program.cs                    ← Service registration + middleware pipeline
```

---

## 3. File Reference

### Program.cs

The entry point and composition root of the application. Does two things:

1. **Builder phase** — registers all services into the DI container:
   `AddCors`, `AddAuthentication`, `AddAuthorization`, `AddSingleton<BookingsStore>`,
   `AddControllers`

2. **Pipeline phase** — wires up middleware in the exact order the app requires.
   Order is not optional — see [Middleware Pipeline Order](#5-middleware-pipeline-order).

---

### Controllers

#### `AuthController.cs`

Route: `api/auth`

| Method | Path          | Auth       | Description                                      |
|--------|---------------|------------|--------------------------------------------------|
| POST   | `/login`      | Anonymous  | Validates credentials, returns a signed JWT      |
| GET    | `/me`         | [Authorize]| Returns the username and role from the JWT claims|

**How login works:**
1. Checks `Username == "employer"` and `Password == "password123"`
2. If wrong → `401 Unauthorized` (no hint about which field failed)
3. If correct → builds a JWT with a `sub` claim (username) and a `role` claim (`Employer`)
4. Signs with HMAC-SHA256 using the key from `appsettings.Development.json`
5. Returns `{ "token": "eyJ..." }`

**How `/me` works:**
`[Authorize]` forces `UseAuthentication` to validate the Bearer token first.
`User.FindFirstValue(...)` then reads the decoded claims that were already placed
on `HttpContext.User` — no second decode needed.

---

#### `BookingsController.cs`

Route: `api/bookings`

| Method | Path           | Auth                      | Description                      |
|--------|----------------|---------------------------|----------------------------------|
| GET    | `/`            | Anonymous                 | Returns all bookings             |
| GET    | `/{id}`        | Anonymous                 | Returns one booking by ID        |
| POST   | `/`            | `[Authorize(Roles="Employer")]` | Creates a new booking      |
| DELETE | `/{id}`        | `[Authorize(Roles="Employer")]` | Deletes a booking by ID    |

Missing token on POST/DELETE → **401**.
Valid token but wrong role → **403**.
Valid Employer token → **201 / 204**.

---

### DTOs

Data Transfer Objects define the exact shape of data crossing the API boundary.
The domain `Models` are never returned directly — always mapped to a DTO.

| File                     | Direction      | Fields                                                    |
|--------------------------|----------------|-----------------------------------------------------------|
| `LoginRequest.cs`        | Request body   | `Username`, `Password`                                    |
| `LoginResponse.cs`       | Response body  | `Token` (JWT string)                                      |
| `CreateBookingRequest.cs`| Request body   | `ConferenceName`, `AttendeeEmail`, `SeatsReserved`        |
| `BookingResponse.cs`     | Response body  | `Id`, `ConferenceName`, `AttendeeEmail`, `BookingDate`, `SeatsReserved` |

All are `record` types — immutable, concise, and serialisation-friendly.

---

### Data

#### `BookingsStore.cs`

A singleton in-memory store backed by a `static List<BookingResponse>`.
Registered as `builder.Services.AddSingleton<BookingsStore>()` so every controller
request shares the same list for the lifetime of the process.

Methods: `GetAll()`, `GetById(id)`, `Create(request)`, `Delete(id)`

Week 2 replacement: inject `AppDbContext` here and swap the list operations for
`await _context.Bookings.ToListAsync()` etc.

---

### Exceptions & Middleware

These were built in Assignments 1.2–1.3 and are unchanged here.

- `NotFoundException` — thrown by controllers when a record is not found; the global
  handler maps it to a `404` response automatically.
- The middleware folder contains the global exception handler that catches every
  unhandled exception and formats a consistent JSON error response, keeping all
  error logic out of controllers.

---

## 4. Authentication & Authorization Explained

### Stateless Auth: Sessions vs JWTs

**Session-based authentication** stores login state on the server. When you log in,
the server creates a session record and issues you a session ID cookie. Every request
sends that cookie back; the server looks it up to identify you. This works for one
server, but breaks when you scale horizontally — if request 2 hits a different instance
than request 1, that instance has no session record unless every instance shares the
same external session store (Redis, SQL, etc.).

**JWT-based (stateless) authentication** embeds the identity *inside* the token.
The server signs a compact JSON payload (username, role, expiry) with a secret key and
hands it to you. Any server that knows the same secret key can verify the signature and
decode your identity independently — no shared store, no database call.

**Why statelessness matters for horizontal scaling:** with five API instances behind a
load balancer, every instance can validate a JWT because they all share `Jwt:SecretKey`
from configuration. No session store to synchronise, no sticky sessions needed, and you
can add or remove instances freely without invalidating anyone's login.

---

### 401 Unauthorized vs 403 Forbidden

| Code | Meaning              | Produced by        | When                                             |
|------|----------------------|--------------------|--------------------------------------------------|
| 401  | "I don't know you"   | `UseAuthentication`| No token, malformed token, or bad signature      |
| 403  | "I know you, but no" | `UseAuthorization` | Valid token, but role doesn't match `[Authorize(Roles)]` |

The pipeline order enforces this: `UseAuthentication` (step 4) always runs before
`UseAuthorization` (step 5). You cannot receive a 403 without first passing step 4.

---

### Token Storage Safety

`localStorage` is readable by any JavaScript on the page. A single XSS vulnerability —
including in a third-party npm package — lets an attacker read the token and make
authenticated API calls as the victim.

**Safer alternatives:**
- **`httpOnly` cookies** — set by the server, completely invisible to JavaScript.
  The browser attaches them automatically. XSS cannot read them.
- **In-memory (React state / module variable)** — token disappears on page refresh,
  limiting the exposure window. Good for short-lived or high-security sessions.

For a Next.js frontend the recommended approach is `httpOnly` cookies set through a
server-side route handler, so the raw JWT never reaches client-side JavaScript at all.

---

## 5. Middleware Pipeline Order

```
Request
  │
  ▼
1. UseSerilogRequestLogging   ← logs every request immediately, before anything can block it
  │
  ▼
2. UseCors                    ← must send CORS headers before any response, including errors
  │
  ▼
3. UseExceptionHandler        ← catches unhandled exceptions from everything below this line
  │
  ▼
4. UseAuthentication          ← decodes the JWT → populates HttpContext.User
  │
  ▼
5. UseAuthorization           ← reads HttpContext.User, checks [Authorize] attributes
  │
  ▼
6. MapControllers             ← routes to the matching controller action
  │
  ▼
Response
```

**Why this exact order?**
- CORS before ExceptionHandler: error responses also need CORS headers or the browser
  will swallow them silently.
- Authentication before Authorization: `UseAuthorization` reads `HttpContext.User`,
  which is only populated after `UseAuthentication` runs. Swap them and role checks
  always fail because `User` is empty.
- Both auth middlewares before `MapControllers`: no controller method ever executes
  without identity being established first.

---

## 6. Endpoint Reference

| Method | Endpoint              | Auth Required            | Success | Notes                         |
|--------|-----------------------|--------------------------|---------|-------------------------------|
| POST   | `/api/auth/login`     | None                     | 200     | Returns JWT token             |
| GET    | `/api/auth/me`        | Bearer token             | 200     | Returns username + role       |
| GET    | `/api/bookings`       | None                     | 200     | Returns all bookings          |
| GET    | `/api/bookings/{id}`  | None                     | 200     | Returns booking by ID         |
| POST   | `/api/bookings`       | Bearer + Employer role   | 201     | Creates a booking             |
| DELETE | `/api/bookings/{id}`  | Bearer + Employer role   | 204     | Deletes a booking             |

---

## 7. Proving It Works — Scalar Walkthrough

Run the API with `dotnet run` and navigate to `https://localhost:{port}/scalar`
(the port is shown in your terminal output).

---

### Step 1 — Anonymous GET (200 OK)

**What you're proving:** Public read access still works with no token at all.

1. In Scalar, find **GET /api/bookings**
2. Click **Send** — do NOT add any Authorization header
3. ✅ You should see **200 OK** and an empty array `[]` (or existing bookings)

📸 **Screenshot to take:** The response panel showing `200 OK` with no Authorization
header present in the request panel.

---

### Step 2 — Unauthenticated POST (401)

**What you're proving:** The write endpoint is locked — no token, no entry.

1. Find **POST /api/bookings**
2. Add a request body:
   ```json
   {
     "conferenceName": "DevConf 2025",
     "attendeeEmail": "test@example.com",
     "seatsReserved": 2
   }
   ```
3. Send with **no Authorization header**
4. ✅ You should see **401 Unauthorized**

📸 **Screenshot to take:** The response panel showing `401 Unauthorized` and the
request body visible, proving the controller method never ran.

---

### Step 3 — Login and decode the token

**What you're proving:** The login endpoint issues a correctly structured JWT.

1. Find **POST /api/auth/login**
2. Send this body:
   ```json
   {
     "username": "employer",
     "password": "password123"
   }
   ```
3. ✅ You should see **200 OK** with a response like:
   ```json
   { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...." }
   ```
4. Copy the token string
5. Open **https://jwt.io** in a new tab
6. Paste the token into the **Encoded** box on the left
7. ✅ The **Payload** panel on the right should show:
   ```json
   {
     "sub": "employer",
     "role": "Employer",
     "exp": 1234567890
   }
   ```

📸 **Screenshot to take:** The jwt.io page with the decoded payload visible showing
`sub`, `role`, and `exp` claims.

---

### Step 4 — Authenticated POST (201 Created)

**What you're proving:** A valid Employer token unlocks the write endpoint.

1. In Scalar, find the **Authentication** or **Bearer token** field
   (usually a lock icon or "Auth" tab at the top of the UI)
2. Paste your token from Step 3
3. Find **POST /api/bookings** again
4. Send the same body as Step 2
5. ✅ You should see **201 Created** with the new booking in the response

📸 **Screenshot to take:** The response panel showing `201 Created` and the booking
object returned, with the Bearer token visible in the request headers.

---

### Step 5 — Wrong role DELETE (403 Forbidden)

**What you're proving:** 401 and 403 are different — a valid token with the wrong role
gets rejected differently than no token at all.

**Temporarily modify `AuthController.cs`:**
```csharp
// Change this line in the Login method:
new Claim(ClaimTypes.Role, "Employer")
// to:
new Claim(ClaimTypes.Role, "User")
```

1. Save and restart the API (`dotnet run`)
2. Call **POST /api/auth/login** again with the same credentials — get a fresh token
3. Paste this "User" token into Scalar's Bearer field
4. Find **DELETE /api/bookings/{id}** — use id `1` (create one first if needed)
5. Send the request
6. ✅ You should see **403 Forbidden** — not 401, because the token IS valid,
   the role just doesn't match

📸 **Screenshot to take:** The response panel showing `403 Forbidden` with the
Authorization header present in the request panel.

**Remember to revert** the role back to `"Employer"` and restart before Step 6.

---

### Step 6 — GET /api/auth/me

**What you're proving:** The `/me` endpoint correctly reads claims from the decoded JWT.

1. Make sure you have a valid **Employer** token in Scalar's Bearer field
   (re-login after reverting the role change from Step 5)
2. Find **GET /api/auth/me**
3. Send the request
4. ✅ You should see **200 OK** with:
   ```json
   {
     "username": "employer",
     "role": "Employer"
   }
   ```

📸 **Screenshot to take:** The response panel showing `200 OK` with the username and
role fields populated correctly.

---

## 8. Suggested Git Commits

Work through these in order — each commit represents one logical unit of work:

```bash
git add .
git commit -m "Configure CORS policy for localhost:3000"

git add .
git commit -m "Add JWT Bearer authentication and authorisation pipeline"

git add .
git commit -m "Add Auth DTOs and login endpoint"

git add .
git commit -m "Secure BookingsController endpoints with role-based authorisation"

git add .
git commit -m "Update README with auth documentation and Scalar walkthrough"
```
