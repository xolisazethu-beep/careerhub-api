using CareerHub.Api.Models;

namespace CareerHub.Api.DTOs;

// ── AUTH ────────────────────────────────────────────────────────────────────

public record RegisterRequest(
    string FullName,
    string Email,
    string Password);

public record LoginRequest(
    string Email,
    string Password);

public record AuthResponse(
    string Token,
    Guid ApplicantId,
    string Email);

// ── JOB REQUESTS ──────────────────────────────────────────────────────────────

public record CreateJobRequest(
    string Title,
    string Description,
    string Location,
    JobType Type,
    Guid CompanyId,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime ClosingDate);

// CompanyId here is the *claimed* owner of the listing. The service checks it
// against the CompanyId already stored on the listing — they must match, which
// is how "a listing can only be updated by the company that owns it" is enforced.
public record UpdateJobRequest(
    Guid CompanyId,
    string Title,
    string Description,
    string Location,
    JobType Type,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime ClosingDate);

// No ApplicantId here — the server reads the applicant's identity from the JWT,
// so the caller cannot apply on someone else's behalf.
public record CreateApplicationRequest(
    string? CoverNote);

// The target status for a status-transition request. The service validates the
// move from the application's current status to this one against the policy.
public record UpdateApplicationStatusRequest(
    ApplicationStatus NewStatus);

// ── JOB RESPONSES ─────────────────────────────────────────────────────────────
// Used by GET /api/jobs. Deliberately does NOT include the company's website,
// description, or any applicant data. The projection selects only these columns,
// so the generated SQL never transfers what the body doesn't show.
public record JobListingResponse(
    Guid Id,
    string Title,
    string Location,
    JobType Type,
    string CompanyName,
    int ApplicationCount,   // computed by the database (COUNT), not by loading a collection
    DateTime PostedAt,
    DateTime ClosingDate,
    bool IsActive);

// Used by GET /api/jobs/{id}. Includes the company and the received applications,
// but each application only exposes the applicant's NAME, submission time, and status.
public record JobDetailResponse(
    Guid Id,
    string Title,
    string Description,
    string Location,
    JobType Type,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime PostedAt,
    DateTime ClosingDate,
    bool IsActive,
    CompanySummary Company,
    int ApplicationCount,
    IReadOnlyList<ApplicationSummary> Applications);

public record CompanySummary(
    Guid Id,
    string Name,
    string Website,
    string Industry);

// ── APPLICATION RESPONSES ──────────────────────────────────────────────────────

public record ApplicationSummary(
    string ApplicantName,
    DateTime SubmittedAt,
    ApplicationStatus Status);

// Returned after a successful application submission, and after a status change.
public record ApplicationResponse(
    Guid JobListingId,
    Guid ApplicantId,
    DateTime SubmittedAt,
    ApplicationStatus Status);

// Used by GET /api/applications/mine — the listings a given applicant has applied to.
public record ApplicantApplicationResponse(
    Guid JobListingId,
    string JobTitle,
    string CompanyName,
    DateTime SubmittedAt,
    ApplicationStatus Status);
