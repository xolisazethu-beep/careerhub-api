using CareerHub.Api.Models;

namespace CareerHub.Api.Services;

public class InMemoryJobService : IJobService
{
    private readonly List<JobListing> _jobs;
    private int _nextId;

    public InMemoryJobService()
    {
        _jobs = new List<JobListing>
        {
            new(1, "Junior Backend Developer",
                "Build and maintain ASP.NET Core APIs supporting our learner platform.",
                "Umuzi", "Cape Town", JobType.FullTime, 25000m, 35000m,
                DateTime.UtcNow.AddDays(-3), true),
            new(2, "Frontend Engineer",
                "Build React interfaces consuming our public APIs.",
                "Yoco", "Johannesburg", JobType.FullTime, 30000m, 45000m,
                DateTime.UtcNow.AddDays(-10), true),
            new(3, "Summer Intern",
                "Pair with senior engineers on real production stories.",
                "Takealot", "Cape Town", JobType.Internship, null, null,
                DateTime.UtcNow.AddDays(-1), true),
        };
        _nextId = _jobs.Max(j => j.Id);
    }

    public IEnumerable<JobListing> GetAll() => _jobs;

    public JobListing? GetById(int id) => _jobs.FirstOrDefault(j => j.Id == id);

    public JobListing Add(JobListing job)
    {
        _nextId++;
        var stored = job with { Id = _nextId };
        _jobs.Add(stored);
        return stored;
    }

    public JobListing? Update(int id, JobListing replacement)
    {
        var index = _jobs.FindIndex(j => j.Id == id);
        if (index < 0) return null;
        var existing = _jobs[index];
        // PostedAt and IsActive are preserved from the original — PUT must not reset server-owned fields.
        var updated = replacement with
        {
            Id = id,
            PostedAt = existing.PostedAt,
            IsActive = existing.IsActive
        };
        _jobs[index] = updated;
        return updated;
    }

    public bool Delete(int id)
    {
        var existing = GetById(id);
        if (existing is null) return false;
        _jobs.Remove(existing);
        return true;
    }

    public bool ExistsByTitleAndCompany(string title, string company, int? excludeId = null) =>
        _jobs.Any(j =>
            j.Id != excludeId &&
            string.Equals(j.Title, title, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(j.Company, company, StringComparison.OrdinalIgnoreCase));
}