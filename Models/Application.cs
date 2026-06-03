namespace CareerHub.Api.Models;

// The status of an application as it moves through the hiring workflow.
// Stored as text in the database (configured in the DbContext) so the column
// is human-readable rather than a meaningless integer.
public enum ApplicationStatus
{
    Submitted,
    UnderReview,
    Interview,
    Offer,
    Rejected,
    Withdrawn
}

// The explicit join entity for the JobListing <-> Applicant many-to-many.
//
// It is modelled explicitly (not as a hidden EF-generated join table) because
// the act of applying is a domain concept that carries its OWN data:
//   - when the application was submitted
//   - what status it is currently in (and that status changes over time)
// A hidden join table can only hold the two foreign keys, so it cannot
// represent any of this.
public class Application
{
    // Composite primary key (configured in the DbContext):
    //   (JobListingId, ApplicantId)
    // This pair is the natural unique identity of an application — one
    // applicant can apply to a given listing at most once. Making it the
    // primary key lets the DATABASE enforce "no duplicate applications"
    // instead of us checking it in C# (that's proof step 7).
    public Guid JobListingId { get; set; }
    public Guid ApplicantId { get; set; }

    // Assignment-required fields on the join entity.
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Submitted;

    // --- Creative additions (optional) ---
    public string CoverNote { get; set; } = string.Empty;   // short pitch from the applicant
    public DateTime? StatusUpdatedAt { get; set; }           // when the status last changed
    // --------------------------------------

    // Navigation properties back to both sides of the relationship.
    // = null! tells the compiler EF Core will always populate these when
    // we ask for them (via Include); it is a deliberate signal, not a shortcut.
    public JobListing JobListing { get; set; } = null!;
    public Applicant Applicant { get; set; } = null!;
}
