namespace CareerHub.Api.Models;

using CareerHub.Api.Controllers;

public enum JobType { FullTime, PartTime, Contract, Internship }

public class JobListing
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public JobType Type { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public DateTime PostedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    // CHANGED: "Company" is no longer a plain string.
    // CompanyId is the foreign key column; Company is the navigation property.
    // EF Core populates Company only when you ask for it via Include().
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    // Job requirements
    public string RequiredDegree { get; set; } = string.Empty;    // e.g., "Bachelor's Degree"
    public string RequiredDiploma { get; set; } = string.Empty;   // e.g., "AWS Certification"
    public int MinimumYearsExperience { get; set; } = 0;

    // Applications received for this listing, through the explicit join entity.
    public ICollection<Application> Applications { get; set; } = [];
}
