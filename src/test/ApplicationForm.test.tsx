// =============================================================
// src/test/ApplicationForm.test.tsx
// MSW network tests (Assignment 3.2, Part 4 — Tests 8 & 9).
//
// Adaptation note: the new 5-step wizard submits to localStorage, so MSW can't
// intercept it (this is Q3's "behaviour MSW cannot help test"). The real HTTP
// submit lives in ApplicationForm — it POSTs to /api/applications via TanStack
// Query, resets/replaces the form on success, and surfaces a server error on
// failure. That is the component these network tests target.
// =============================================================

import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./msw/server";
import { renderWithProviders, screen, fireEvent, userEvent } from "./utils";
import ApplicationForm from "@/components/ApplicationForm";

const API = process.env.NEXT_PUBLIC_API_URL;

/** Fill every required field so the Zod schema accepts the submit. */
async function fillAllFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Full name"), "Alice Candidate");
  await user.type(screen.getByLabelText("Email"), "candidate@example.com");
  // The cover letter must be ≥50 chars; set it instantly rather than typing
  // char-by-char (slow) — userEvent can't paste into an empty field cheaply.
  fireEvent.change(screen.getByLabelText("Cover letter"), {
    target: {
      value:
        "I am a strong fit for this role because I have shipped production React apps.",
    },
  });
  // yearsOfExperience + noticePeriodWeeks default to 0; availableImmediately true.
}

describe("ApplicationForm — submit flow (MSW)", () => {
  it("happy path: shows the confirmation after a successful submission", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ApplicationForm jobId="job-1" jobTitle="Senior Frontend Engineer" />);

    await fillAllFields(user);
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    // The form is replaced by a success confirmation once the POST resolves.
    expect(
      await screen.findByRole("heading", { name: "Application submitted" }),
    ).toBeInTheDocument();
  });

  it("error path: keeps the entered values when the API returns 500", async () => {
    // Override the happy-path handler for this test only.
    server.use(
      http.post(`${API}/api/applications`, () => new HttpResponse(null, { status: 500 })),
    );

    const user = userEvent.setup();
    renderWithProviders(<ApplicationForm jobId="job-1" jobTitle="Senior Frontend Engineer" />);

    await fillAllFields(user);
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    // A server-error alert appears…
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    // …and the form was NOT reset — the typed value is still there.
    expect(screen.getByDisplayValue("Alice Candidate")).toBeInTheDocument();
  });
});
