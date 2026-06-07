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
    ICompanyRepository companies,
    ISkillRepository skills) : IJobListingService
{
    // The largest page the search endpoint will serve in one request. Caps an
    // over-eager (or malicious) pageSize so one call cannot pull the whole table.
    private const int MaxPageSize = 100;

    public Task<List<JobListingResponse>> GetActiveListingsAsync() =>
        listings.GetActiveListingsAsync();

    public Task<PagedResult<JobListingResponse>> SearchAsync(JobSearchFilter filter)
    {
        // The service owns paging validation; the repository trusts the filter.
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize switch
        {
            < 1 => 20,
            > MaxPageSize => MaxPageSize,
            _ => filter.PageSize
        };

        // MinExperience is a "years I have" ceiling — a negative value is nonsense.
        if (filter.MinExperience is < 0)
            throw new ValidationException("minExperience cannot be negative.");

        return listings.SearchAsync(filter with { Page = page, PageSize = pageSize });
    }

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

        // RULES: location must be present and experience must be non-negative.
        ValidateListingFields(request.Location, request.MinYearsExperience);

        // Resolve skill names to Skill rows (creating any new ones) and attach them.
        var requiredSkills = await skills.GetOrCreateByNamesAsync(request.RequiredSkills ?? []);

        var listing = new JobListing
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Location = request.Location,
            IsRemote = request.IsRemote,
            MinYearsExperience = request.MinYearsExperience,
            Qualifications = request.Qualifications,
            Type = request.Type,
            CompanyId = request.CompanyId,
            SalaryMin = request.SalaryMin,
            SalaryMax = request.SalaryMax,
            PostedAt = DateTime.UtcNow,
            ClosingDate = request.ClosingDate,
            IsActive = true,
            RequiredSkills = requiredSkills
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

        // RULES: location must be present and experience must be non-negative.
        ValidateListingFields(request.Location, request.MinYearsExperience);

        // Resolve the requested skills and REPLACE the listing's skill set. The
        // navigation was Included by the repository, so clearing and re-adding
        // lets EF Core diff the join rows on save.
        var requiredSkills = await skills.GetOrCreateByNamesAsync(request.RequiredSkills ?? []);

        listing.Title = request.Title;
        listing.Description = request.Description;
        listing.Location = request.Location;
        listing.IsRemote = request.IsRemote;
        listing.MinYearsExperience = request.MinYearsExperience;
        listing.Qualifications = request.Qualifications;
        listing.Type = request.Type;
        listing.SalaryMin = request.SalaryMin;
        listing.SalaryMax = request.SalaryMax;
        listing.ClosingDate = request.ClosingDate;

        listing.RequiredSkills.Clear();
        foreach (var skill in requiredSkills)
            listing.RequiredSkills.Add(skill);

        await listings.UpdateListingAsync(listing);
        return await GetByIdAsync(id);
    }

    // Shared value rules for create and update. Throws ValidationException (-> 400)
    // so the GlobalExceptionHandler maps it; the controller never sees the check.
    private static void ValidateListingFields(string location, int minYearsExperience)
    {
        if (string.IsNullOrWhiteSpace(location))
            throw new ValidationException("A listing's location is required.");

        if (minYearsExperience < 0)
            throw new ValidationException("Minimum years of experience cannot be negative.");
    }

    public async Task CloseAsync(Guid id)
    {
        var listing = await listings.GetListingForUpdateAsync(id)
            ?? throw new NotFoundException($"Job listing {id} does not exist.");

        await listings.CloseListingAsync(listing);
    }
}
