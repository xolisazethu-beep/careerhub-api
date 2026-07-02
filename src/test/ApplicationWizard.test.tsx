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

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  renderWithProviders,
  screen,
  fireEvent,
  act,
  within,
  waitFor,
  userEvent,
} from "./utils";
import { Toaster } from "sonner";
import JobApplicationWizard from "@/components/apply/JobApplicationWizard";

// Assignment 3.4, Part 2 Step 5 — Test 12 mocks the apply boundary so we can
// force a 422 without a live backend. `applyToJob` is the single authenticated
// call the wizard makes on submit; rejecting it with a typed ApiError exercises
// the exact production path (parseApiError would build the same object).
vi.mock("@/lib/applicant-api", () => ({ applyToJob: vi.fn() }));
import { applyToJob } from "@/lib/applicant-api";
import { ApiError } from "@/lib/api-error";

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

// ---------------------------------------------------------------------------
// Test 12 (Assignment 3.4) — a 422 validation error from the API navigates the
// user back to the step owning the invalid field and shows the message INLINE.
// ---------------------------------------------------------------------------

/** Drive the wizard from step 1 through to a ready-to-submit step 5. */
async function fillEntireWizard(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
) {
  // Step 1 — Personal
  await user.type(screen.getByLabelText("Full name(s)"), "Alice");
  await user.type(screen.getByLabelText("Surname"), "Candidate");
  fireEvent.change(screen.getByLabelText("Date of birth"), {
    target: { value: "1995-06-15" },
  });
  await clickNext(user);

  // Step 2 — Contact (email is pre-filled from the user prop)
  await user.type(screen.getByLabelText("Phone"), "0821234567");
  await user.type(screen.getByLabelText("Physical address"), "12 Main Road");
  await user.type(screen.getByLabelText("City"), "Cape Town");
  await user.type(screen.getByLabelText("Postal code"), "8001");
  await clickNext(user);

  // Step 3 — Qualifications (Matric = non-tertiary → no extra document)
  await user.selectOptions(
    screen.getByLabelText("Highest qualification"),
    "Matric",
  );
  await user.type(screen.getByLabelText("Institution"), "Rondebosch High");
  await clickNext(user);

  // Step 4 — Job-specific: a valid 100+ char motivation (client passes; the
  // SERVER is the one that will reject it in this test).
  fireEvent.change(screen.getByLabelText(/why are you a good fit/i), {
    target: {
      value:
        "I have shipped production React apps for five years and thrive in this exact problem space, end to end.",
    },
  });
  fireEvent.change(screen.getByLabelText("Available start date"), {
    target: { value: "2026-08-01" },
  });
  await clickNext(user);

  // Step 5 — Documents & consent. Upload every required PDF (each read is an
  // async FileReader, so poll until every slot shows its Remove button), then
  // tick all three consents (fireEvent.click toggles once, avoiding the
  // label-forwarding double-fire userEvent can cause on a wrapped checkbox).
  const slotCount = container.querySelectorAll('input[type="file"]').length;
  for (let i = 0; i < slotCount; i++) {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "doc.pdf", {
      type: "application/pdf",
    });
    // Re-query each time: a completed upload re-renders its slot, which can
    // detach the previously captured <input> node. The i-th slot without a value
    // is always the next one to fill.
    const inputs = Array.from(
      container.querySelectorAll('input[type="file"]'),
    ) as HTMLInputElement[];
    fireEvent.change(inputs[i], { target: { files: [pdf] } });
    // Await THIS slot's read before the next (each is an async FileReader).
    await waitFor(
      () =>
        expect(
          screen.getAllByRole("button", { name: /remove/i }),
        ).toHaveLength(i + 1),
      { timeout: 4000 },
    );
  }

  // Tick all three consents. userEvent.click fires the React onChange that React
  // Hook Form listens to (fireEvent.click toggles the DOM box but doesn't update
  // RHF's value); re-query fresh each time so a re-render can't hand us a stale
  // node.
  const consentCount = screen.getAllByRole("checkbox").length;
  for (let i = 0; i < consentCount; i++) {
    const cb = screen.getAllByRole("checkbox")[i] as HTMLInputElement;
    if (!cb.checked) await user.click(cb);
  }
  await waitFor(
    () => screen.getAllByRole("checkbox").forEach((c) => expect(c).toBeChecked()),
    { timeout: 4000 },
  );
}

describe("JobApplicationWizard — Test 12: 422 field error", () => {
  beforeEach(() => {
    vi.mocked(applyToJob).mockReset();
  });

  it("navigates back to the offending step and shows the server message inline", async () => {
    const user = userEvent.setup({ delay: null });
    // The API rejects the submission: cover letter too short (mapped to the
    // wizard's motivationText field, which lives on the Job-specific step).
    vi.mocked(applyToJob).mockRejectedValueOnce(
      new ApiError("Validation failed", 422, "VALIDATION", {
        coverLetter: ["Cover letter must be at least 100 characters."],
      }),
    );

    const { container } = renderWithProviders(
      <>
        <Toaster />
        <JobApplicationWizard
          job={JOB}
          user={{ name: "", email: "alice@example.com" }}
          token="test-token"
        />
      </>,
    );

    await fillEntireWizard(user, container);

    // Guard: the submit button must be enabled (all docs uploaded + consents
    // ticked) — if this fails, the fill/upload helper regressed, not the 422 map.
    const submitBtn = screen.getByRole("button", { name: /submit application/i });
    expect(submitBtn).toBeEnabled();

    // Open the confirm dialog and submit.
    await user.click(submitBtn);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: /submit application/i }),
    );

    // The submission was attempted...
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(applyToJob).toHaveBeenCalledTimes(1);

    // ...and on the 422 the wizard jumped BACK to the Job-specific step,
    expect(
      await screen.findByRole("heading", { name: "Job-specific questions" }),
    ).toBeInTheDocument();
    // ...shows the server's field message inline,
    expect(
      await screen.findByText("Cover letter must be at least 100 characters."),
    ).toBeInTheDocument();
    // ...and surfaces the review toast.
    expect(
      await screen.findByText(/please review your application/i),
    ).toBeInTheDocument();
  }, 60000);
});
