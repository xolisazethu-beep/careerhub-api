// =============================================================
// src/test/ApplicationWizard.test.tsx
// Behaviour tests for the 5-step JobApplicationWizard (Assignment 3.2, Part 3).
//
// Adaptation note: the assignment was written for the old 3-step ApplicationWizard
// (useSession + HTTP submit + a "review step"). This session replaced it with the
// 5-step JobApplicationWizard — auth comes in as a `user` prop, submit is a
// localStorage write, and there's no in-wizard review step (a separate
// confirmation page renders the summary). Tests target the real component and the
// real step headings; the auth gate (page-level) is covered in apply-gate.test.tsx
// and the submit/draft behaviour in their own files.
// =============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { renderWithProviders, screen, fireEvent, act, userEvent } from "./utils";
import JobApplicationWizard from "@/components/apply/JobApplicationWizard";

const JOB = {
  id: "job-1",
  title: "Senior Frontend Engineer",
  company: "Acme",
  requiresDriversLicence: false,
  minimumExperienceYears: 0,
  minimumRequirements: "",
  skills: [],
};

/** Fresh, signed-out-of-profile candidate so step 1 starts mostly empty. */
function renderWizard(userName = "") {
  return renderWithProviders(
    <JobApplicationWizard job={JOB} user={{ name: userName, email: "alice@example.com" }} />,
  );
}

/**
 * Click Next, then flush the async validate-and-advance continuation inside act.
 * `next()` validates asynchronously and only THEN updates step state — without
 * this flush the re-render lands outside act and the next assertion can race it.
 */
async function clickNext(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /next/i }));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** Fill the minimum required step-1 fields so Next is allowed. */
async function fillStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Full name(s)"), "Alice");
  await user.type(screen.getByLabelText("Surname"), "Candidate");
  // Date inputs: userEvent.type is unreliable on type=date, so set directly.
  fireEvent.change(screen.getByLabelText("Date of birth"), {
    target: { value: "1995-06-15" },
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("JobApplicationWizard — step navigation", () => {
  it("renders the step 1 heading on mount (smoke)", () => {
    renderWizard();
    expect(
      screen.getByRole("heading", { name: "Personal information" }),
    ).toBeInTheDocument();
  });

  it("blocks advancement when required step 1 fields are empty", async () => {
    const user = userEvent.setup();
    renderWizard();

    await clickNext(user);

    expect(screen.getByText("Please enter your full name(s).")).toBeInTheDocument();
    expect(screen.getByText("Please enter your surname.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your date of birth.")).toBeInTheDocument();
    // Still on step 1.
    expect(
      screen.getByRole("heading", { name: "Personal information" }),
    ).toBeInTheDocument();
  });

  it("advances to step 2 when step 1 required fields are filled", async () => {
    const user = userEvent.setup();
    renderWizard();

    await fillStep1(user);
    await clickNext(user);

    expect(
      screen.getByRole("heading", { name: "Contact details" }),
    ).toBeInTheDocument();
  });

  it("Back button preserves step 1 values", async () => {
    const user = userEvent.setup();
    renderWizard();

    await fillStep1(user);
    await clickNext(user);
    expect(screen.getByRole("heading", { name: "Contact details" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(
      await screen.findByRole("heading", { name: "Personal information" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Candidate")).toBeInTheDocument();
  });
});
