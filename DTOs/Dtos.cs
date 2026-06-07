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

// RequiredSkills is a list of skill *names*; the service resolves them to Skill
// rows (creating any that don't exist) via ISkillRepository before attaching them.
public record CreateJobRequest(
    string Title,
    string Description,
    string Location,
    bool IsRemote,
    int MinYearsExperience,
    string Qualifications,
    JobType Type,
    Guid CompanyId,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime ClosingDate,
    List<string> RequiredSkills);

// CompanyId here is the *claimed* owner of the listing. The service checks it
// against the CompanyId already stored on the listing — they must match, which
// is how "a listing can only be updated by the company that owns it" is enforced.
public record UpdateJobRequest(
    Guid CompanyId,
    string Title,
    string Description,
    string Location,
    bool IsRemote,
    int MinYearsExperience,
    string Qualifications,
    JobType Type,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime ClosingDate,
    List<string> RequiredSkills);

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
    bool IsRemote,
    int MinYearsExperience,
    JobType Type,
    string CompanyName,
    IReadOnlyList<string> RequiredSkills,   // skill names, projected from the join table
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
    bool IsRemote,
    int MinYearsExperience,
    string Qualifications,
    JobType Type,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime PostedAt,
    DateTime ClosingDate,
    bool IsActive,
    CompanySummary Company,
    IReadOnlyList<string> RequiredSkills,   // skill names, projected from the join table
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

// ── JOB SEARCH ────────────────────────────────────────────────────────────────
// The controller binds the GET /api/jobs/search query string into this filter and
// hands it to the service unchanged. Every field is optional except the paging
// values, which the controller defaults (page=1, pageSize=20). All filtering and
// projection happen inside JobListingRepository.SearchAsync.
public record JobSearchFilter(
    string? Location,
    string? Skill,
    int? MinExperience,
    JobType? JobType,
    string? Q,
    int Page,
    int PageSize);

// A single page of results plus the metadata a client needs to page through the
// rest. TotalPages is derived, not stored. Generic so it can wrap any item DTO.
public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
