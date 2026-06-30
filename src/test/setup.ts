// =============================================================
// src/test/setup.ts
// Global test setup (Assignment 3.2 — Testing).
//   • jest-dom matchers.
//   • MSW lifecycle: listen → resetHandlers after each test → close.
//   • Mocks for the Next.js navigation hooks the components call (useRouter,
//     useParams), and for jsdom gaps (window.print, matchMedia).
// =============================================================

import "@testing-library/jest-dom";
import { configure } from "@testing-library/dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { server } from "./msw/server";

// findBy*/waitFor default to a 1000ms timeout — too tight on this slow CI/dev
// box where a re-render can take longer. Raise it so timing alone never flakes.
configure({ asyncUtilTimeout: 15000 });

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  // nuqs writes ?step= to the URL; jsdom keeps window.location between tests in
  // a file, so reset it so every test starts at a clean URL (step 0).
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

// next/navigation isn't available outside the App Router runtime. Provide a
// no-op router and a controllable useParams (tests override it per case).
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useParams: vi.fn(() => ({ jobId: "job-1", id: "app-123" })),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// jsdom doesn't implement these; the confirmation page calls window.print().
if (typeof window !== "undefined") {
  window.print = vi.fn();
  if (!window.matchMedia) {
    // @ts-expect-error minimal stub
    window.matchMedia = () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
  }
}
