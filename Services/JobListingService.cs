using CareerHub.Api.DTOs;
using CareerHub.Api.Exceptions;
using CareerHub.Api.Models;
using CareerHub.Api.Repositories;

// NOTE: there is deliberately NO "using Microsoft.EntityFrameworkCore;" here.
// This class owns business rules only. Every data-access concern lives behind
// the repository interfaces it depends on. (Proof step 1.)

namespace CareerHub.Api.Services;

public class JobListingService(
    IJobListingRepository listings,
    ICompanyRepository companies) : IJobListingService
{
    public Task<List<JobListingResponse>> GetActiveListingsAsync() =>
        listings.GetActiveListingsAsync();

    public async Task<JobDetailResponse> GetByIdAsync(Guid id) =>
        await listings.GetListingDetailAsync(id)
        ?? throw new NotFoundException($"Job listing {id} does not exist.");

    public async Task<JobDetailResponse> CreateAsync(CreateJobRequest request)
    {
        // RULE: a listing cannot be created for a company that does not exist.
        if (!await companies.CompanyExistsAsync(request.CompanyId))
            throw new NotFoundException($"Company {request.CompanyId} does not exist.");

        // RULE: the closing date must be in the future at the time of creation.
        if (request.ClosingDate <= DateTime.UtcNow)
            throw new ValidationException("A listing's closing date must be in the future.");

        var listing = new JobListing
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
            ClosingDate = request.ClosingDate,
            IsActive = true
        };

        await listings.AddListingAsync(listing);
        return await GetByIdAsync(listing.Id);
    }

    public async Task<JobDetailResponse> UpdateAsync(Guid id, UpdateJobRequest request)
    {
        var listing = await listings.GetListingForUpdateAsync(id)
            ?? throw new NotFoundException($"Job listing {id} does not exist.");

        // RULE: a closed listing can no longer be edited.
        if (!listing.IsActive)
            throw new ListingClosedException($"Job listing {id} is closed and cannot be updated.");

        // RULE: only the company that owns the listing may update it.
        if (request.CompanyId != listing.CompanyId)
            throw new ForbiddenException("Only the company that owns this listing may update it.");

        // RULE: the closing date must still be in the future.
        if (request.ClosingDate <= DateTime.UtcNow)
            throw new ValidationException("A listing's closing date must be in the future.");

        listing.Title = request.Title;
        listing.Description = request.Description;
        listing.Location = request.Location;
        listing.Type = request.Type;
        listing.SalaryMin = request.SalaryMin;
        listing.SalaryMax = request.SalaryMax;
        listing.ClosingDate = request.ClosingDate;

        await listings.UpdateListingAsync(listing);
        return await GetByIdAsync(id);
    }

    public async Task CloseAsync(Guid id)
    {
        var listing = await listings.GetListingForUpdateAsync(id)
            ?? throw new NotFoundException($"Job listing {id} does not exist.");

        await listings.CloseListingAsync(listing);
    }
}
