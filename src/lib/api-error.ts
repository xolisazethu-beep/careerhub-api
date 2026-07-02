// =============================================================
// src/lib/api-error.ts
// Assignment 3.4, Part 2 Step 1 — the typed error foundation.
//
// Every AUTHENTICATED API call throws an `ApiError` (never a plain Error), so the
// UI can branch on a stable, typed `code` instead of scraping a status number out
// of a message string. Route-level error boundaries read `error.code` to decide
// whether to offer a retry, a sign-in link, or a "go back" link; the application
// wizard reads `error.fields` to map 422 validation errors back onto the form.
//
// (Repo note: the assignment specifies `client/src/lib/api-error.ts`. This project
// has the app at the repo ROOT, so the canonical path is `src/lib/api-error.ts`.)
// =============================================================

/** The stable, UI-facing classification of an API failure. */
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "SERVER_ERROR"
  | "UNKNOWN";

/**
 * RFC 7807 Problem Details — the JSON body ASP.NET Core returns on an error.
 * `errors` is present on validation failures (a map of field → messages).
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

/**
 * A typed API failure. Extends the built-in Error (so `instanceof Error` and
 * existing `err instanceof Error` guards keep working) and adds:
 *   • status — the raw HTTP status (e.g. 409),
 *   • code   — the stable classification the UI switches on,
 *   • fields — per-field validation messages (only on VALIDATION errors).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    // Restore the prototype chain — without this, `instanceof ApiError` can fail
    // when the class is transpiled down to ES5-era output (a classic TS gotcha).
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isUnauthorized(): boolean {
    return this.code === "UNAUTHORIZED";
  }
  get isForbidden(): boolean {
    return this.code === "FORBIDDEN";
  }
  get isValidation(): boolean {
    return this.code === "VALIDATION";
  }
}

/** Map a raw HTTP status to the stable code (the assignment's status table). */
export function statusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION";
    default:
      return status >= 500 ? "SERVER_ERROR" : "UNKNOWN";
  }
}

/** A human-readable default when the body carries no useful message. */
function defaultMessage(code: ApiErrorCode, status: number): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Your session has expired. Please sign in again.";
    case "FORBIDDEN":
      return "You don't have permission to do that.";
    case "NOT_FOUND":
      return "We couldn't find what you were looking for.";
    case "CONFLICT":
      return "That action conflicts with the current state.";
    case "VALIDATION":
      return "Some of the information provided isn't valid.";
    case "SERVER_ERROR":
      return "The server ran into a problem. Please try again shortly.";
    default:
      return `Request failed (${status}).`;
  }
}

/**
 * Read an error `Response` and construct the right `ApiError`.
 *
 * Reads the RFC 7807 body for the human message (`detail`, then the first field
 * error, then `title`) and, on a validation failure, lifts `problem.errors` onto
 * `fields`. The `res.json()` is wrapped in try/catch because some error responses
 * (401/403/504) legitimately have NO body — reading one would otherwise throw and
 * mask the real status.
 *
 * Classification note: the status table maps 422 → VALIDATION. ASP.NET model
 * validation, however, returns 400 with an `errors` map. So a 400 that carries
 * field errors is ALSO treated as VALIDATION — otherwise those field messages
 * would be lost. Every other status follows the table exactly.
 */
export async function parseApiError(res: Response): Promise<ApiError> {
  let problem: ProblemDetails = {};
  try {
    problem = (await res.json()) as ProblemDetails;
  } catch {
    // No body (or not JSON) — fall back to status-derived defaults below.
  }

  const hasFieldErrors =
    !!problem.errors && Object.keys(problem.errors).length > 0;

  const code: ApiErrorCode =
    res.status === 422 || (res.status === 400 && hasFieldErrors)
      ? "VALIDATION"
      : statusToCode(res.status);

  const firstFieldMessage = hasFieldErrors
    ? Object.values(problem.errors!).flat()[0]
    : undefined;

  const message =
    problem.detail?.trim() ||
    firstFieldMessage ||
    problem.title?.trim() ||
    defaultMessage(code, res.status);

  const fields = code === "VALIDATION" ? problem.errors : undefined;

  return new ApiError(message, res.status, code, fields);
}
