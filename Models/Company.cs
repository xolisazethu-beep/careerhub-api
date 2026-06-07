namespace CareerHub.Api.Models;

// A Company exists independently of any job listing.
// One Company can own many JobListings — this is the "one" side of a one-to-many.
public class Company
{
    public Guid Id { get; set; }

    // Assignment-required company-level info that used to be impossible
    // when "company" was just a string on the listing.
    public string Name { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;

    // --- Creative additions (optional, trim if you want a leaner schema) ---
    public string Description { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public int? FoundedYear { get; set; }
    // -----------------------------------------------------------------------

    // Collection navigation — the reverse side of the relationship.
    // Initialised to an empty collection so it is never null.
    public ICollection<JobListing> JobListings { get; set; } = [];
}
