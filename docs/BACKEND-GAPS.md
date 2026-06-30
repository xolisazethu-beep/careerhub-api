# Gaps Identified (from the frontend session)

> Paste this into the **"Gaps Identified"** section of the backend prompt.
> Source of truth for the frontend's needs. Field/enum/endpoint names below are
> what the Next.js wizard will call — match them exactly on the server.

## A. Confirmed gaps (your backend prompt already covers these — just align names)

| # | Frontend need | Backend feature that covers it | Notes to align |
|---|---|---|---|
| 1 | Expanded Application entity | Feature 1 | See **field inventory** below — the wizard collects more than Feature 1 lists. |
| 2 | Draft persistence (save on every step) | Feature 2 (`PUT /api/applications/{id}/draft`, `POST /api/applications/draft`) | Frontend will call `POST .../draft` on first "Save as Draft", then `PUT` thereafter. |
| 3 | Submit with full validation | Feature 2 (`POST /api/applications/{id}/submit`) | Frontend expects **422 + structured error list** so it can map errors back to the offending step. |
| 4 | Document upload (PDF, 3 MB) | Feature 3 | `DocumentType` enum below matches the wizard exactly. |
| 5 | Saved jobs / bookmarks | Feature 4 | Heart toggle on listings + `/dashboard/saved`. |
| 6 | Match score | Feature 5 | **Decision: server-side** (frontend will NOT build a client calculator; it consumes `?includeMatchScore=true` and `GET /api/jobs/{id}/match-score`). |
| 7 | Notification preferences | Feature 6 | Settings page binds 1:1 to the entity's bool fields. |
| 8 | Status timeline + withdraw w/ reason | Feature 7 | Frontend timeline renders `StatusHistory` (status, timestamp, note). |

## B. MISSING from the backend prompt — please ADD these

These are needed by the frontend but are **not** in Features 1–9 as written:

1. **`Job.RequiresDriversLicence` (bool, default false).**
   The Documents step conditionally shows the Driver's Licence upload *only when the
   job requires it*. Feature 1 expands `Application` but never adds this flag to the
   **Job** entity. Add it to the Job model + `JobListingResponse`/`JobListingDetailResponse`
   DTOs and the recruiter job-create payload.

2. **Consent fields on `Application` (3 bools).**
   The final step has three consent checkboxes that must persist for audit:
   `ConfirmedInformationAccurate`, `ConsentToDataProcessing`, `ConsentToEmployerContact`.
   `submit` must reject (422) if any required consent is false.

3. **Personal-info fields Feature 1 omits.**
   The wizard's Step 1 collects more than `Nationality`/`Disability`:
   add `FirstName`, `Surname` (or `FullNames`+`Surname`), `Gender`
   (enum: `Male, Female, Other, PreferNotToSay`), `Race` (nullable string, incl.
   "Prefer not to say"), `DateOfBirth` (DateOnly). Decide whether these live on
   `Application` or are copied from a `UserProfile` (see #4) at draft-create time.

4. **`UserProfile` entity — match score depends on it.**
   Feature 5 computes the score from "skills/requirements in the DB" and "the user
   profile", but no feature defines a server-side user profile. The frontend currently
   holds this client-side (`profile-store.ts`): `Skills[]`, `HighestQualification`,
   `YearsOfExperience`, `Province`, `WillingToRelocate`. Without a `UserProfile`
   table the match score has nothing to score against. Add the entity + a
   `GET/PUT /api/users/me/profile` pair, and auto-create it on registration
   (same hook as Feature 6's notification prefs).

5. **Single-application GET for the confirmation page.**
   The frontend redirects to `/applications/{id}/confirmation` with a printable
   summary after submit. Confirm `GET /api/applications/{id}` returns the FULL
   submitted application (all wizard fields + document metadata list + StatusHistory),
   owner-auth-checked. Feature 3 covers documents listing but not the parent record.

6. **`GET /api/applications` (current user's list) for the tracking dashboard.**
   `/dashboard/applications` needs the signed-in candidate's own applications with
   status + StatusHistory, filterable/searchable. Feature 7 covers status *mutations*
   but no feature lists the candidate's-own-applications read endpoint.

## C. Field inventory the wizard POSTs (so the entity matches step-for-step)

- **Step 1 — Personal:** firstName/fullNames, surname, gender, race?, dateOfBirth,
  disabilityStatus(bool), disabilityDetails?, nationality.
- **Step 2 — Contact:** email, phone, alternatePhone?, physicalAddress, city,
  province (SA provinces + "Other"), postalCode.
- **Step 3 — Qualifications:** highestQualification, institution, yearCompleted?,
  employmentStatus(enum), yearsOfExperience(int), linkedInUrl?, portfolioUrl?.
- **Step 4 — Job-specific:** motivationText(min 100 chars), expectedSalary?(ZAR decimal),
  noticePeriod, availableStartDate(DateOnly), willingToRelocate(bool).
- **Step 5 — Documents & consent:** documents (see enum), 3 consent bools (see B.2).

## D. DocumentType enum (must match the wizard's conditional logic)

`IdDocument, Passport, MatricResults, TertiaryQualification, DriversLicence, MotivationLetter, Cv`

- `IdDocument` **or** `Passport` required — conditional on `nationality` (SA → ID, else Passport).
- `MatricResults` — always required.
- `TertiaryQualification` — required only if Step 3 `highestQualification` is tertiary.
- `DriversLicence` — shown/required only if `Job.RequiresDriversLicence` (see B.1).
- `MotivationLetter`, `Cv` — always required.

## E. Status enum (frontend timeline labels)

Backend: `Draft, Submitted, UnderReview, Shortlisted, InterviewScheduled, OfferExtended, Rejected, Withdrawn`
Frontend display labels: Draft, Submitted, Under Review, Shortlisted, Interview, Offer, Rejected, Withdrawn.

## F. Frontend contract changes to sync back

When the backend lands, the frontend will need: `NEXT_PUBLIC_API_BASE_URL` to point at
the real API for these routes (currently only job-board reads use it; applications/auth
go through in-app Next routes today), and the Auth.js session must carry a token the
`[Authorize]` endpoints accept. Flag the auth token shape (JWT vs cookie) so the
frontend `fetch` layer can attach it.
