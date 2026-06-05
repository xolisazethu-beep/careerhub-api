namespace CareerHub.Api.Controllers;

using CareerHub.Api.Models;
public enum ApplicationStatus
{
    Submitted,
    UnderReview,
    Interview,
    Offer,
    Rejected,
    Withdrawn
}
public class Application{

    public Guid JobListingId { get; set; }
    public Guid ApplicantId { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Submitted;
    public string CoverNote { get; set; } = string.Empty;  
    public DateTime? StatusUpdatedAt { get; set; }           
    public JobListing JobListing { get; set; } = null!;
    public Applicant Applicant { get; set; } = null!;
}
