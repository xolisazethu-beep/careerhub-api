// =============================================================
// src/test/draft-persistence.test.tsx
// Draft persistence tests (Assignment 3.2, Stretch A).
//
// Uses the REAL jsdom localStorage — no vi.spyOn mock — because the behaviour
// under test IS the round-trip through storage: write on save, read on mount.
// A spy would only prove a method was called; the real implementation proves the
// data actually survives and is restored into the form the user sees.
// =============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent } from "./utils";
import JobApplicationWizard from "@/components/apply/JobApplicationWizard";

const JOB = { id: "job-1", title: "Senior Frontend Engineer", company: "Acme", requiresDriversLicence: false, minimumExperienceYears: 0, minimumRequirements: "", skills: [] };
const DRAFT_KEY = "careerhub_wizard_drafts";
const EMAIL = "alice@example.com";

function plantDraft(values: Record<string, unknown>, step = 0) {
  window.localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      [`${EMAIL}::${JOB.id}`]: {
        jobId: JOB.id,
        jobTitle: JOB.title,
        company: JOB.company,
        email: EMAIL,
        values,
        step,
        updatedAt: new Date().toISOString(),
      },
    }),
  );
}

function renderWizard() {
  return renderWithProviders(
    <JobApplicationWizard job={JOB} user={{ name: "", email: EMAIL }} />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("JobApplicationWizard — draft persistence", () => {
  it("restores a saved draft into the form and shows the restored banner on mount", async () => {
    plantDraft({ fullNames: "Restored", surname: "Draftson" });

    renderWizard();

    expect(await screen.findByText(/restored your saved draft/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Restored")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Draftson")).toBeInTheDocument();
  });

  it("writes a draft to localStorage when 'Save as Draft' is clicked", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("Full name(s)"), "Wandile");
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    const raw = window.localStorage.getItem(DRAFT_KEY);
    expect(raw).toBeTruthy();
    expect(raw).toContain("Wandile");
  });
});
