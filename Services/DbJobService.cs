using Microsoft.EntityFrameworkCore;
using CareerHub.Api.Data;
using CareerHub.Api.Models;

namespace CareerHub.Api.Services;

public class DbJobService(CareerHubDbContext db) : IJobService
{
    public async Task<IEnumerable<JobListing>> GetAllAsync()
        => await db.JobListings.ToListAsync();

    public  async Task<JobListing?> GetByIdAsync(Guid id)
        => await db.JobListings.FindAsync(id);

    public async Task<JobListing> AddAsync(JobListing job)
    {
        db.JobListings.Add(job);
        await db.SaveChangesAsync();
        return job;
    }

    public async Task<JobListing?> UpdateAsync(Guid id, JobListing replacement)
    {
        var existing = await db.JobListings.FindAsync(id);
        if (existing is null) return null;

        existing.Title = replacement.Title;
        existing.Description = replacement.Description;
        existing.Company = replacement.Company;
        existing.Location = replacement.Location;
        existing.Type = replacement.Type;
        existing.SalaryMin = replacement.SalaryMin;
        existing.SalaryMax = replacement.SalaryMax;

        await db.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var existing = await db.JobListings.FindAsync(id);
        if (existing is null) return false;

        db.JobListings.Remove(existing);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsByTitleAndCompanyAsync(
        string title, string company, Guid? excludeId = null)
        => await db.JobListings.AnyAsync(j =>
            j.Id != excludeId &&
            j.Title.ToLower() == title.ToLower() &&
            j.Company.ToLower() == company.ToLower());
}


