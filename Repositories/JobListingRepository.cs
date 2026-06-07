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
                j.IsRemote,
                j.MinYearsExperience,
                j.Type,
                j.Company.Name,
                j.RequiredSkills.Select(s => s.Name).ToList(),
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
                j.IsRemote,
                j.MinYearsExperience,
                j.Qualifications,
                j.Type,
                j.SalaryMin,
                j.SalaryMax,
                j.PostedAt,
                j.ClosingDate,
                j.IsActive,
                new CompanySummary(j.Company.Id, j.Company.Name, j.Company.Website, j.Company.Industry),
                j.RequiredSkills.Select(s => s.Name).ToList(),
                j.Applications.Count,
                j.Applications
                    .OrderByDescending(a => a.SubmittedAt)
                    .Select(a => new ApplicationSummary(a.Applicant.FullName, a.SubmittedAt, a.Status))
                    .ToList()))
            .FirstOrDefaultAsync();

    // Tracked (no AsNoTracking) — the service mutates this instance and then
    // calls UpdateListingAsync / CloseListingAsync to persist it. RequiredSkills
    // is Included so the service can REPLACE the listing's skill set and EF Core
    // diffs the join rows correctly on save.
    public Task<JobListing?> GetListingForUpdateAsync(Guid id) =>
        db.JobListings
            .Include(j => j.RequiredSkills)
            .FirstOrDefaultAsync(j => j.Id == id);

    // Filtered, paged search over OPEN listings only (active AND closing date in
    // the future). Each optional filter narrows the query; the projection and the
    // COUNT run as SQL, and only the requested page of rows is materialised.
    public async Task<PagedResult<JobListingResponse>> SearchAsync(JobSearchFilter filter)
    {
        var query = db.JobListings
            .AsNoTracking()
            .Where(j => j.IsActive && j.ClosingDate > DateTime.UtcNow);

        // location: partial, case-insensitive match (ILike '%term%').
        if (!string.IsNullOrWhiteSpace(filter.Location))
            query = query.Where(j => EF.Functions.ILike(j.Location, $"%{filter.Location}%"));

        // skill: listing requires a skill whose name matches (case-insensitive).
        if (!string.IsNullOrWhiteSpace(filter.Skill))
            query = query.Where(j => j.RequiredSkills.Any(s => EF.Functions.ILike(s.Name, filter.Skill)));

        // minExperience: listings the caller qualifies for with this many years.
        if (filter.MinExperience is int minExp)
            query = query.Where(j => j.MinYearsExperience <= minExp);

        // jobType: exact enum match.
        if (filter.JobType is JobType jobType)
            query = query.Where(j => j.Type == jobType);

        // q: keyword match against Title OR Description (case-insensitive).
        if (!string.IsNullOrWhiteSpace(filter.Q))
            query = query.Where(j =>
                EF.Functions.ILike(j.Title, $"%{filter.Q}%") ||
                EF.Functions.ILike(j.Description, $"%{filter.Q}%"));

        // Total BEFORE paging, so the client knows how many pages exist.
        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(j => j.PostedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(j => new JobListingResponse(
                j.Id,
                j.Title,
                j.Location,
                j.IsRemote,
                j.MinYearsExperience,
                j.Type,
                j.Company.Name,
                j.RequiredSkills.Select(s => s.Name).ToList(),
                j.Applications.Count,
                j.PostedAt,
                j.ClosingDate,
                j.IsActive))
            .ToListAsync();

        return new PagedResult<JobListingResponse>(items, totalCount, filter.Page, filter.PageSize);
    }

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
