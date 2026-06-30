// =============================================================
// src/test/utils.tsx
// renderWithProviders — wraps a component in the providers the CareerHub UI
// needs under test, and controls the fake auth session.
//
//   • QueryClientProvider with retry:false (no retry storms on a mocked 500).
//   • NuqsTestingAdapter — the 5-step wizard keeps ?step= in the URL via nuqs;
//     this adapter lets useQueryState work without the App Router runtime.
//   • AuthProvider — the real localStorage-backed context the apply flow uses
//     (tests plant/clear `careerhub.session` to simulate sign-in).
//   • next-auth's useSession is mocked here per the assignment; renderWith-
//     Providers sets its return value before each render. (Note: the wizard
//     itself takes the user as a PROP and reads AuthContext at the page level,
//     so the session mock is provided for parity/other components.)
// =============================================================

import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { vi } from "vitest";
import type { Session } from "next-auth";
import { AuthProvider } from "@/context/AuthContext";

// Mock the next-auth client module at the top of this file (assignment Part 2).
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  SessionProvider: ({ children }: { children: ReactNode }) => children,
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Imported AFTER the mock so this binding is the mocked function.
import { useSession } from "next-auth/react";

/** A signed-in candidate — the default identity for most tests. */
export const candidateSession = {
  user: { name: "Alice Candidate", email: "alice@example.com", role: "candidate" },
  expires: "2099-01-01T00:00:00Z",
} as unknown as Session;

/** A signed-in employer — for the "employers can't apply" scenario. */
export const employerSession = {
  user: { name: "Eve Employer", email: "eve@acme.test", role: "employer" },
  expires: "2099-01-01T00:00:00Z",
} as unknown as Session;

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface Options {
  /** null = unauthenticated. Defaults to a Candidate. */
  session?: Session | null;
  /** Initial URL query for nuqs (e.g. "?step=2"). */
  searchParams?: string | URLSearchParams;
}

export function renderWithProviders(
  ui: ReactElement,
  { session = candidateSession, searchParams = "" }: Options = {},
) {
  vi.mocked(useSession).mockReturnValue({
    data: session,
    status: session ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as ReturnType<typeof useSession>);

  const client = makeClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={searchParams}>
        <QueryClientProvider client={client}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </NuqsTestingAdapter>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

// Re-export RTL helpers so tests import everything from one place.
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
