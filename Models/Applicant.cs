namespace CareerHub.Api.Models;

using CareerHub.Api.Controllers;

// An Applicant registers for the platform once and can apply to many JobListings.
// Like the demo's Attendee, the link to listings goes through the join entity
// (Application), because that link carries its own data.
public class Applicant
{
    public Guid Id { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    // Hashed password (PBKDF2). Never store the plain password.
    public string PasswordHash { get; set; } = string.Empty;

    // --- Creative additions (optional) ---
    public string Phone { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;   // e.g. "Backend Developer, 4 yrs"
    public string ResumeUrl { get; set; } = string.Empty;
    public int YearsOfExperience { get; set; }
    // --------------------------------------

    // Collection navigation — note it is ICollection<Application>, NOT
    // ICollection<JobListing>, because the relationship is realised through
    // the explicit join entity that holds the submission date and status.
    public ICollection<Application> Applications { get; set; } = [];
}
