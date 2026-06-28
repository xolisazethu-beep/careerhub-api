"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SessionProvider } from "next-auth/react";

/**
 * Client-side provider boundary for TanStack Query.
 *
 * This is the ONLY file in the data layer that needs `"use client"`. By keeping
 * the boundary here, `layout.tsx` stays a Server Component — it simply renders
 * <Providers> around its children.
 *
 * The QueryClient is created with the `useState` initialiser form rather than a
 * module-level `const`. A module-level client would be shared across every
 * request on the server and could leak one user's cached data into another's
 * response. Creating it inside `useState(() => …)` gives each browser session
 * its own client, created exactly once per mount (the initialiser never re-runs
 * on re-render).
 */
export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The job board reads from a Dockerised API that can take ~30s to
            // wake on a cold start (JIT + EF model/query-plan compilation), and
            // may briefly refuse connections while the container boots. With
            // TanStack's defaults (3 retries over ~7s) that window expires
            // before the API is ready, leaving the user on the "We couldn't
            // load the job listings / Failed to fetch" error state. Retry more
            // times with a capped backoff (~35s total) so a still-warming
            // backend resolves into real data instead of an error.
            retry: 6,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
            // The board doesn't change second-to-second; treat data as fresh
            // for 30s so navigating back doesn't refire the cold-start fetch.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // NuqsAdapter sits at the OUTERMOST level so every client component below can
  // read/write filter state from the URL via nuqs (Week 2 Day 4 — /jobs/explore).
  // It only wires nuqs to Next's App Router; it does not render any DOM of its own.
  // SessionProvider (Auth.js v5) exposes the session to client components via
  // useSession(); the server already has it through auth(). NuqsAdapter stays the
  // outermost wrapper so URL-filter state works everywhere below it.
  return (
    <NuqsAdapter>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </SessionProvider>
    </NuqsAdapter>
  );
}
