using CareerHub.Api.Data;
using CareerHub.Api.DTOs;
using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Repositories;

// The only class that knows JobListings are stored in EF Core / PostgreSQL.
// All AsNoTracking, Select projections, AnyAsync and SaveChangesAsync calls for
// listings live here and nowhere else.
public class JobListingRepository(CareerHubDbContext db) : IJobListingRepository
{
    // One SQL statement: JOIN to companies, COUNT subquery for applications.
    // AsNoTracking + Select projection -> only the columns the DTO exposes travel.
    public Task<List<JobListingResponse>> GetActiveListingsAsync() =>
        db.JobListings
            .AsNoTracking()
            .Where(j => j.IsActive)
            .OrderByDescending(j => j.PostedAt)
            .Select(j => new JobListingResponse(
                j.Id,
                j.Title,
                j.Location,
                j.Type,
                j.Company.Name,
                j.Applications.Count,
                j.PostedAt,
                j.ClosingDate,
                j.IsActive))
            .ToListAsync();

    // One query: listing + company summary + application count + each applicant's
    // NAME only. Nothing the response body does not show is transferred.
    public Task<JobDetailResponse?> GetListingDetailAsync(Guid id) =>
        db.JobListings
            .AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => new JobDetailResponse(
                j.Id,
                j.Title,
                j.Description,
                j.Location,
                j.Type,
                j.SalaryMin,
                j.SalaryMax,
                j.PostedAt,
                j.ClosingDate,
                j.IsActive,
                new CompanySummary(j.Company.Id, j.Company.Name, j.Company.Website, j.Company.Industry),
                j.Applications.Count,
                j.Applications
                    .OrderByDescending(a => a.SubmittedAt)
                    .Select(a => new ApplicationSummary(a.Applicant.FullName, a.SubmittedAt, a.Status))
                    .ToList()))
            .FirstOrDefaultAsync();

    // Tracked (no AsNoTracking) — the service mutates this instance and then
    // calls UpdateListingAsync / CloseListingAsync to persist it.
    public Task<JobListing?> GetListingForUpdateAsync(Guid id) =>
        db.JobListings.FirstOrDefaultAsync(j => j.Id == id);

    public Task<bool> ListingExistsAsync(Guid id) =>
        db.JobListings.AnyAsync(j => j.Id == id);

    public Task<bool> IsOpenForApplicationsAsync(Guid id) =>
        db.JobListings.AnyAsync(j => j.Id == id && j.IsActive && j.ClosingDate > DateTime.UtcNow);

    public async Task AddListingAsync(JobListing listing)
    {
        db.JobListings.Add(listing);
        await db.SaveChangesAsync();
    }

    public async Task UpdateListingAsync(JobListing listing)
    {
        db.JobListings.Update(listing);
        await db.SaveChangesAsync();
    }

    // "Closing" is a state change the repository owns end to end: flip the flag
    // and persist. The caller never sets the flag or calls SaveChanges.
    public async Task CloseListingAsync(JobListing listing)
    {
        listing.IsActive = false;
        db.JobListings.Update(listing);
        await db.SaveChangesAsync();
    }
}
