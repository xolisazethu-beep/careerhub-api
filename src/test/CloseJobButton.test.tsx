// =============================================================
// src/test/CloseJobButton.test.tsx
// AlertDialog confirmation tests (Assignment 3.2, Part 4 — Tests 10 & 11).
//
// Adaptation note: CloseJobButton confirms via a Next.js SERVER ACTION
// (closeJobListing), not an HTTP fetch — MSW intercepts network requests, not
// server actions, so the action module is mocked here. We assert the
// user-observable outcome: the dialog opens, and on confirm the button flips to
// its "Closed …" success state.
// =============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, within, userEvent } from "./utils";
import CloseJobButton from "@/components/CloseJobButton";
import { closeJobListing } from "@/app/actions/closeJob";

vi.mock("@/app/actions/closeJob", () => ({
  closeJobListing: vi.fn(async () => ({
    status: "success",
    jobTitle: "Senior Frontend Engineer",
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CloseJobButton — destructive confirmation", () => {
  it("opens the AlertDialog when the close button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CloseJobButton jobId="job-1" currentStatus="Active" />);

    await user.click(screen.getByRole("button", { name: "Close listing" }));

    expect(
      await screen.findByRole("heading", { name: "Close this listing?" }),
    ).toBeInTheDocument();
  });

  it("calls the close action and shows the closed state when confirmed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CloseJobButton jobId="job-1" currentStatus="Active" />);

    // Open the dialog.
    await user.click(screen.getByRole("button", { name: "Close listing" }));
    const dialog = await screen.findByRole("alertdialog");

    // Confirm inside the dialog (scoped, since the trigger shares the label).
    await user.click(within(dialog).getByRole("button", { name: "Close listing" }));

    // The action ran and the UI moved to its success state.
    expect(vi.mocked(closeJobListing)).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Closed/)).toBeInTheDocument();
  });
});
