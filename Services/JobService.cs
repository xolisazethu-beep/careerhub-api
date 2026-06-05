using CareerHub.Api.Data;
using CareerHub.Api.DTOs;
using CareerHub.Api.Exceptions;
using CareerHub.Api.Models;
using CareerHub.Api.Controllers;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Services;

public class JobService(CareerHubDbContext db) : IJobService
{
    // ── LIST (Parts 5 & 6) ──────────────────────────────────────────────────
    // AsNoTracking  -> no change-tracking snapshots (read-only query).
    // Select        -> projects straight into the DTO — SQL transfers ONLY
    //                  the columns the response body exposes.
    // j.Applications.Count -> COUNT subquery in SQL, no rows loaded into memory.
    // ONE SQL statement with a JOIN to companies — no N+1.
    public async Task<List<JobListingResponse>> GetAllAsync()
    {
        return await db.JobListings
            .AsNoTracking()
            .OrderByDescending(j => j.PostedAt)
            .Select(j => new JobListingResponse(
                j.Id,
                j.Title,
                j.Location,
                j.Type,
                j.Company.Name,
                j.Applications.Count,
                j.PostedAt,
                j.IsActive))
            .ToListAsync();
    }

    // ── DETAIL (Parts 5 & 6) ────────────────────────────────────────────────
    // One query. Pulls the listing, its company summary, the application count,
    // and each application's applicant NAME only — nothing the body doesn't show.
    public async Task<JobDetailResponse?> GetByIdAsync(Guid id)
    {
        return await db.JobListings
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
                j.IsActive,
                new CompanySummary(j.Company.Id, j.Company.Name, j.Company.Website, j.Company.Industry),
                j.Applications.Count,
                j.Applications
                    .OrderByDescending(a => a.SubmittedAt)
                    .Select(a => new ApplicationSummary(a.Applicant.FullName, a.SubmittedAt, a.Status))
                    .ToList()))
            .FirstOrDefaultAsync();
    }

    // ── CREATE (write path — tracking IS used because we SaveChanges) ────────
    public async Task<JobDetailResponse> CreateAsync(CreateJobRequest request)
    {
        var companyExists = await db.Companies.AnyAsync(c => c.Id == request.CompanyId);
        if (!companyExists)
            throw new NotFoundException($"Company {request.CompanyId} does not exist.");

        var job = new JobListing
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Location = request.Location,
            Type = request.Type,
            CompanyId = request.CompanyId,
            SalaryMin = request.SalaryMin,
            SalaryMax = request.SalaryMax,
            PostedAt = DateTime.UtcNow,
            IsActive = true
        };

        db.JobListings.Add(job);
        await db.SaveChangesAsync();

        return (await GetByIdAsync(job.Id))!;
    }

    // ── APPLY (write path) ───────────────────────────────────────────────────
    // The composite PK (JobListingId, ApplicantId) makes a duplicate insert
    // impossible — the database enforces one application per applicant per listing.
    public async Task<ApplicationResponse> ApplyAsync(Guid jobId, Guid applicantId, CreateApplicationRequest request)
    {
        var jobExists = await db.JobListings.AnyAsync(j => j.Id == jobId);
        if (!jobExists)
            throw new NotFoundException($"Job listing {jobId} does not exist.");

        var applicantExists = await db.Applicants.AnyAsync(a => a.Id == applicantId);
        if (!applicantExists)
            throw new NotFoundException($"Applicant {applicantId} does not exist.");

        var alreadyApplied = await db.Applications
            .AnyAsync(a => a.JobListingId == jobId && a.ApplicantId == applicantId);
        if (alreadyApplied)
            throw new DuplicateApplicationException("This applicant has already applied to this listing.");

        var application = new Application
        {
            JobListingId = jobId,
            ApplicantId = applicantId,
            SubmittedAt = DateTime.UtcNow,
            Status = ApplicationStatus.Submitted,
            CoverNote = request.CoverNote ?? string.Empty
        };

        db.Applications.Add(application);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            throw new DuplicateApplicationException("This applicant has already applied to this listing.");
        }

        return new ApplicationResponse(
            application.JobListingId,
            application.ApplicantId,
            application.SubmittedAt,
            application.Status);
    }
}