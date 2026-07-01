// =============================================================
// src/test/apply-gate.test.tsx
// Auth-gate tests (Assignment 3.2, Part 3 — Tests 5 & 6, adapted).
//
// Adaptation note: the new wizard doesn't gate on a Next click — the /apply page
// gates before the wizard ever renders (show "Sign in to apply" when there's no
// signed-in job seeker). Identity now comes from the UNIFIED Auth.js session
// (backed by the real backend JWT), so we drive the gate via the mocked
// useSession that renderWithProviders controls. The job itself is fetched from
// the backend — MSW answers GET /api/v1/jobs/:id.
// =============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { renderWithProviders, screen } from "./utils";
import ApplyPage from "@/app/apply/[jobId]/page";

beforeEach(() => {
  window.localStorage.clear();
});

describe("Apply flow — authentication gate", () => {
  it("shows the sign-in prompt and hides the wizard when not authenticated", async () => {
    renderWithProviders(<ApplyPage />, { session: null });

    expect(await screen.findByText("Sign in to apply")).toBeInTheDocument();
    // The wizard's first step must NOT be on screen.
    expect(
      screen.queryByRole("heading", { name: "Personal information" }),
    ).not.toBeInTheDocument();
  });

  it("renders the wizard when authenticated as a job seeker", async () => {
    // Default session in renderWithProviders is an authenticated candidate.
    renderWithProviders(<ApplyPage />);

    expect(
      await screen.findByRole("heading", { name: "Personal information" }),
    ).toBeInTheDocument();
  });
});
