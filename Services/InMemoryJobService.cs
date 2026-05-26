using CareerHub.Api.Models;

namespace CareerHub.Api.Services;

/// <summary>
/// Hardcoded, in-memory implementation of <see cref="IJobService"/>.
/// Returned tasks complete synchronously (Task.FromResult) — the async
/// signature is here so route handlers can stay async even before real I/O exists.
/// </summary>
public class InMemoryJobService : IJobService
{
    private static readonly IReadOnlyList<JobListing> _jobs = new List<JobListing>
    {
        new(
            Id: 1,
            Title: "Senior Backend Engineer",
            Description: "Design and build distributed services in C# and .NET 10. Own end-to-end delivery for a high-throughput jobs platform.",
            Company: "Acme Corp",
            Location: "Cape Town, ZA",
            Type: "Full-time"
        ),
        new(
            Id: 2,
            Title: "Frontend Developer (React / Next.js)",
            Description: "Build the candidate-facing dashboard that consumes the CareerHub API. Strong TypeScript and accessibility chops expected.",
            Company: "Globex",
            Location: "Remote",
            Type: "Full-time"
        ),
        new(
            Id: 3,
            Title: "Cloud Solutions Architect",
            Description: "Design and review scalable, secure cloud architectures on Azure. Mentor engineering teams on cost and reliability tradeoffs.",
            Company: "Initech",
            Location: "Johannesburg, ZA",
            Type: "Contract"
        ),
        new(
            Id: 4,
            Title: "Junior QA Engineer",
            Description: "Write automated tests for our REST APIs and own integration coverage across services.",
            Company: "Acme Corp",
            Location: "Hybrid — Cape Town",
            Type: "Full-time"
        ),
    };

    public Task<IReadOnlyList<JobListing>> GetAllAsync(CancellationToken cancellationToken = default)
        => Task.FromResult(_jobs);

    public Task<JobListing?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => Task.FromResult(_jobs.FirstOrDefault(j => j.Id == id));
}
