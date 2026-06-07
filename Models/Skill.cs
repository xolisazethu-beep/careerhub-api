namespace CareerHub.Api.Models;

// A reusable, named competency (e.g. "C#", "PostgreSQL") that many job listings
// can require and that many listings can share. Modelled as its own entity — not
// a free-text string on the listing — so the SAME skill is stored once and a
// listing can be searched by it.
//
// The JobListing <-> Skill relationship is a pure many-to-many with no extra data
// of its own, so (unlike Application) it uses an EF Core *skip navigation*: the
// join table is generated and managed by EF, and both sides expose the other side
// directly. (See CareerHubDbContext.OnModelCreating.)
public class Skill
{
    public Guid Id { get; set; }

    // Business rule: skill names are unique (enforced by a unique index in the
    // DbContext). SkillRepository matches on this case-insensitively so "C#" and
    // "c#" resolve to the same row rather than creating a duplicate.
    public string Name { get; set; } = string.Empty;

    // Reverse side of the skip navigation: every listing that requires this skill.
    public ICollection<JobListing> JobListings { get; set; } = [];
}
