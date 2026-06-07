namespace CareerHub.Api.Models;

public enum JobType { FullTime, PartTime, Contract, Internship }

public class JobListing
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;

    // Whether the role can be performed remotely. Independent of Location — a
    // listing can be both "Cape Town, ZA" and remote-friendly.
    public bool IsRemote { get; set; }

    // The minimum years of experience the role expects. Business rule: must be
    // >= 0 (enforced in JobListingService). Drives the /jobs/search minExperience
    // filter ("show me jobs I qualify for with N years").
    public int MinYearsExperience { get; set; }

    // Free-text description of the qualifications a candidate needs
    // (e.g. "BSc Computer Science or equivalent; AWS certification a plus").
    public string Qualifications { get; set; } = string.Empty;

    public JobType Type { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public DateTime PostedAt { get; set; } = DateTime.UtcNow;

    // The last moment an applicant may apply. Several business rules depend on it:
    //   - at creation, it must be in the future
    //   - an application is rejected once it has passed
    // A listing is "open for applications" while it is active AND this date is
    // still in the future.
    public DateTime ClosingDate { get; set; }

    // IsActive doubles as the "open/closed" flag. Closing a listing sets it false;
    // a closed listing can no longer be updated. (See JobListingService.)
    public bool IsActive { get; set; } = true;

    // CHANGED: "Company" is no longer a plain string.
    // CompanyId is the foreign key column; Company is the navigation property.
    // EF Core populates Company only when you ask for it via Include().
    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    // Applications received for this listing, through the explicit join entity.
    public ICollection<Application> Applications { get; set; } = [];

    // The skills this listing requires. A pure many-to-many (skip navigation):
    // EF Core owns the join table; the service populates this collection from the
    // request's skill names via ISkillRepository. (See CareerHubDbContext.)
    public ICollection<Skill> RequiredSkills { get; set; } = [];
}
