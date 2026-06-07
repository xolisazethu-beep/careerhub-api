using CareerHub.Api.Data;
using CareerHub.Api.DTOs;
using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Repositories;

// The only class that knows applications are stored in EF Core / PostgreSQL.
public class ApplicationRepository(CareerHubDbContext db) : IApplicationRepository
{
    public Task<bool> HasAlreadyAppliedAsync(Guid jobListingId, Guid applicantId) =>
        db.Applications.AnyAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

    public Task<List<ApplicationSummary>> GetApplicationsForListingAsync(Guid jobListingId) =>
        db.Applications
            .AsNoTracking()
            .Where(a => a.JobListingId == jobListingId)
            .OrderByDescending(a => a.SubmittedAt)
            .Select(a => new ApplicationSummary(a.Applicant.FullName, a.SubmittedAt, a.Status))
            .ToListAsync();

    public Task<List<ApplicantApplicationResponse>> GetApplicationsByApplicantAsync(Guid applicantId) =>
        db.Applications
            .AsNoTracking()
            .Where(a => a.ApplicantId == applicantId)
            .OrderByDescending(a => a.SubmittedAt)
            .Select(a => new ApplicantApplicationResponse(
                a.JobListingId,
                a.JobListing.Title,
                a.JobListing.Company.Name,
                a.SubmittedAt,
                a.Status))
            .ToListAsync();

    // Tracked — the service changes Status on this instance, then calls
    // UpdateApplicationAsync to persist it.
    public Task<Application?> GetApplicationAsync(Guid jobListingId, Guid applicantId) =>
        db.Applications.FirstOrDefaultAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

    public async Task AddApplicationAsync(Application application)
    {
        db.Applications.Add(application);
        await db.SaveChangesAsync();
    }

    public async Task UpdateApplicationAsync(Application application)
    {
        db.Applications.Update(application);
        await db.SaveChangesAsync();
    }
}
