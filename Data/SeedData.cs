using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Data;

// Seeds enough data to demonstrate the one-query list endpoint:
// 5 companies, one listing each, plus applicants and one sample application.
public static class SeedData
{
    public static async Task SeedAsync(CareerHubDbContext db)
    {
        if (await db.Companies.AnyAsync())
            return; // already seeded

        var companies = new List<Company>
        {
            new() { Id = Guid.NewGuid(), Name = "Nimbus Cloud",   Industry = "Cloud Infrastructure", Website = "https://nimbus.example" },
            new() { Id = Guid.NewGuid(), Name = "Acacia Finance", Industry = "Fintech",              Website = "https://acacia.example" },
            new() { Id = Guid.NewGuid(), Name = "Baobab Health",  Industry = "Healthtech",           Website = "https://baobab.example" },
            new() { Id = Guid.NewGuid(), Name = "Kestrel Games",  Industry = "Gaming",               Website = "https://kestrel.example" },
            new() { Id = Guid.NewGuid(), Name = "Sable Logistics", Industry = "Logistics",           Website = "https://sable.example" },
        };

        // All seeded listings close 30 days out so they are "open for applications"
        // when the API starts — except the last one, deliberately seeded already
        // closed so the "cannot apply to a closed listing" rule is easy to demo.
        var openUntil = DateTime.UtcNow.AddDays(30);
        var alreadyClosed = DateTime.UtcNow.AddDays(-1);

        // A small catalogue of reusable skills. SkillRepository would create these
        // on demand at runtime, but seeding them lets the search-by-skill endpoint
        // return results immediately on a fresh database.
        var skills = new List<Skill>
        {
            new() { Id = Guid.NewGuid(), Name = "C#" },
            new() { Id = Guid.NewGuid(), Name = ".NET" },
            new() { Id = Guid.NewGuid(), Name = "PostgreSQL" },
            new() { Id = Guid.NewGuid(), Name = "Docker" },
        };

        var listings = new List<JobListing>
        {
            new() { Id = Guid.NewGuid(), Title = "Backend Engineer",   Description = "Build and maintain APIs.",        Location = "Cape Town, ZA", IsRemote = false, MinYearsExperience = 3, Qualifications = "BSc Computer Science or equivalent experience; strong C# and REST API background.", Type = JobType.FullTime,   CompanyId = companies[0].Id, SalaryMin = 600000, SalaryMax = 850000, ClosingDate = openUntil, RequiredSkills = [skills[0], skills[1], skills[2]] },
            new() { Id = Guid.NewGuid(), Title = "Data Analyst",       Description = "Model financial datasets.",       Location = "Johannesburg", Type = JobType.FullTime,   CompanyId = companies[1].Id, SalaryMin = 500000, SalaryMax = 720000, ClosingDate = openUntil },
            new() { Id = Guid.NewGuid(), Title = "Mobile Developer",   Description = "Ship the patient mobile app.",    Location = "Remote",        Type = JobType.Contract,   CompanyId = companies[2].Id, SalaryMin = 550000, SalaryMax = 780000, ClosingDate = openUntil },
            new() { Id = Guid.NewGuid(), Title = "Game Designer",      Description = "Design core gameplay loops.",     Location = "Durban",        Type = JobType.FullTime,   CompanyId = companies[3].Id, SalaryMin = 480000, SalaryMax = 700000, ClosingDate = openUntil },
            new() { Id = Guid.NewGuid(), Title = "Operations Intern",  Description = "Support the logistics team.",     Location = "Pretoria",      Type = JobType.Internship, CompanyId = companies[4].Id, SalaryMin = 120000, SalaryMax = 150000, ClosingDate = alreadyClosed, IsActive = false },
        };

        var applicants = new List<Applicant>
        {
            new() { Id = Guid.NewGuid(), FullName = "Thandi Mokoena", Email = "thandi@example.com", YearsOfExperience = 5, Headline = "Backend Developer" },
            new() { Id = Guid.NewGuid(), FullName = "Sipho Dlamini",  Email = "sipho@example.com",  YearsOfExperience = 3, Headline = "Data Analyst" },
        };

        // One sample application so the detail endpoint has something to show.
        var sampleApplication = new Application
        {
            JobListingId = listings[0].Id,
            ApplicantId = applicants[0].Id,
            SubmittedAt = DateTime.UtcNow,
            Status = ApplicationStatus.Submitted,
            CoverNote = "Excited to apply for the backend role."
        };

        db.Companies.AddRange(companies);
        db.Skills.AddRange(skills);
        db.JobListings.AddRange(listings);
        db.Applicants.AddRange(applicants);
        db.Applications.Add(sampleApplication);

        await db.SaveChangesAsync();
    }
}
