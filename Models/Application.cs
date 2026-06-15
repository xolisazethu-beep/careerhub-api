namespace CareerHub.Api.Models;

public class Application
{
    public int Id { get; set; }
    public int JobListingId { get; set; }
    public JobListing? JobListing { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Submitted;
    public DateTimeOffset SubmittedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
