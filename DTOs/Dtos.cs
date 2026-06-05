using CareerHub.Api.Models;
using CareerHub.Api.Controllers;

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

// ── REQUESTS ────────────────────────────────────────────────────────────────

public record CreateJobRequest(
    string Title,
    string Description,
    string Location,
    JobType Type,
    Guid CompanyId,
    decimal? SalaryMin,
    decimal? SalaryMax);

// No ApplicantId here any more — the server reads the applicant's identity
// from the JWT, so the caller cannot apply on someone else's behalf.
public record CreateApplicationRequest(
    string? CoverNote);

// ── LIST RESPONSE ─────────────────────────────────────────────────────────────
// Used by GET /api/jobs. Deliberately does NOT include the company's website,
// description, or any applicant data. The projection in JobService selects only
// these columns, so the generated SQL never transfers what the body doesn't show.
public record JobListingResponse(
    Guid Id,
    string Title,
    string Location,
    JobType Type,
    string CompanyName,
    int ApplicationCount,   // computed by the database (COUNT), not by loading a collection
    DateTime PostedAt,
    bool IsActive);

// ── DETAIL RESPONSE ─────────────────────────────────────────────────────────
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
    bool IsActive,
    CompanySummary Company,
    int ApplicationCount,
    IReadOnlyList<ApplicationSummary> Applications);

public record CompanySummary(
    Guid Id,
    string Name,
    string Website,
    string Industry);

public record ApplicationSummary(
    string ApplicantName,
    DateTime SubmittedAt,
    ApplicationStatus Status);

// Returned after a successful application submission.
public record ApplicationResponse(
    Guid JobListingId,
    Guid ApplicantId,
    DateTime SubmittedAt,
    ApplicationStatus Status);
