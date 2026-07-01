namespace CareerHub.Api.Models;

/// <summary>
/// The hiring pipeline stages required by Assignment 2.4 Part 8. Stored as text
/// so the RANK() statistics query can FILTER on readable status names.
/// </summary>
public enum ApplicationStatus { Submitted, UnderReview, Shortlisted, Rejected, Offered }

/// <summary>
/// Explicit join entity linking an <see cref="Applicant"/> to a
/// <see cref="JobListing"/>. The composite key (JobListingId, ApplicantId) makes
/// "one application per person per listing" a database guarantee.
/// </summary>
public class Application
{
    public Guid JobListingId { get; set; }
    public Guid ApplicantId { get; set; }

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Submitted;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public string CoverNote { get; set; } = string.Empty;

    /// <summary>
    /// The skills the applicant ticked from the listing's required set when applying.
    /// Stored as a PostgreSQL <c>text[]</c> so the employer's review screen can show
    /// exactly which competencies the candidate claimed.
    /// </summary>
    public List<string> SelectedSkills { get; set; } = [];

    // ── Optional CV upload (stored in-row as bytea) ──────────────────────────
    // Small-scale, single-database deployment: keeping the PDF in the row avoids a
    // blob store and keeps the CV transactional with the application. Nullable —
    // the JSON apply path (and applicants who skip the upload) simply have none.
    public byte[]? CvData { get; set; }
    public string? CvFileName { get; set; }
    public string? CvContentType { get; set; }

    public JobListing JobListing { get; set; } = null!;
    public Applicant Applicant { get; set; } = null!;
}
