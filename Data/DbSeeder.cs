using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(CareerHubDbContext db, CancellationToken ct = default)
    {
        if (await db.JobListings.AnyAsync(ct))
            return;

        var now = DateTimeOffset.UtcNow;

        var jobs = new List<JobListing>
        {
            new()
            {
                Title = "Backend Engineer",
                Company = "Acme Corp",
                Location = "Remote",
                Description = "Design and maintain .NET APIs and background services.",
                SalaryMin = 80000,
                SalaryMax = 120000,
                PostedAt = now.AddDays(-2),
                ExpiresAt = now.AddDays(28),
                UpdatedAt = now.AddDays(-2),
                IsActive = true
            },
            new()
            {
                Title = "Frontend Developer",
                Company = "Globex",
                Location = "Cape Town",
                Description = "Build React and TypeScript interfaces.",
                SalaryMin = 60000,
                SalaryMax = 90000,
                PostedAt = now.AddDays(-5),
                ExpiresAt = now.AddDays(20),
                UpdatedAt = now.AddDays(-5),
                IsActive = true
            },
            new()
            {
                Title = "Data Analyst",
                Company = "Initech",
                Location = "Johannesburg",
                Description = "SQL, reporting, and dashboards. This listing is already expired.",
                SalaryMin = 50000,
                SalaryMax = 75000,
                PostedAt = now.AddDays(-40),
                ExpiresAt = now.AddDays(-1),
                UpdatedAt = now.AddDays(-40),
                IsActive = true
            }
        };

        db.JobListings.AddRange(jobs);
        await db.SaveChangesAsync(ct);
    }
}
