// =============================================================
// src/instrumentation.ts
// Assignment 3.4, Part 5 Step 4 — Sentry error monitoring.
//
// Next.js calls `register()` ONCE per server runtime at startup. We initialise
// Sentry for BOTH server runtimes here — the Node.js runtime (most routes) and
// the Edge runtime (middleware) — reading the DSN from the environment. When no
// DSN is set (`enabled: false`) this is a complete no-op, so local dev and CI
// run untouched; production turns it on simply by setting SENTRY_DSN on Vercel.
//
// `onRequestError` is Next 15's hook for server-side render/route errors; wiring
// it to Sentry's capturer means those errors are reported too, not just ones
// that bubble to a React error boundary.
// =============================================================

import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.SENTRY_DSN;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      enabled: Boolean(dsn),
      // Sample a modest slice of transactions for performance tracing.
      tracesSampleRate: 0.1,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      enabled: Boolean(dsn),
      tracesSampleRate: 0.1,
    });
  }
}

// Report server Component / route-handler errors to Sentry (Next 15 hook).
export const onRequestError = Sentry.captureRequestError;
