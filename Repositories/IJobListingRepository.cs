using CareerHub.Api.DTOs;
using CareerHub.Api.Models;

namespace CareerHub.Api.Repositories;

// Every method names a use case the system actually has. There is no GetAll(),
// no IQueryable<T> leaking out, and no SaveChangesAsync for the caller to call —
// this interface is fully implementable without EF Core.
public interface IJobListingRepository
{
    // Read — projected DTOs (efficient single queries, no N+1).

    // All ACTIVE listings, each with its company name and application count.
    Task<List<JobListingResponse>> GetActiveListingsAsync();

    // A single listing in full detail, or null if it does not exist.
    Task<JobDetailResponse?> GetListingDetailAsync(Guid id);

    // The tracked domain entity, used by the service when it needs to APPLY a
    // change (owner check, closed check, then update). Returns null if missing.
    Task<JobListing?> GetListingForUpdateAsync(Guid id);

    // Yes/no checks — named methods returning bool, not "fetch and null-check".

    // Owns the "does this listing exist" validation that ApplicationService needs
    // before creating an application. The query lives here, in the listing's repo.
    Task<bool> ListingExistsAsync(Guid id);

    // True only while the listing is active AND its closing date is in the future.
    Task<bool> IsOpenForApplicationsAsync(Guid id);

    // Write — accept a domain entity (or id) and persist internally.

    Task AddListingAsync(JobListing listing);
    Task UpdateListingAsync(JobListing listing);
    Task CloseListingAsync(JobListing listing);
}
