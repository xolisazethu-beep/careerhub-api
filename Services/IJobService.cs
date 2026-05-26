using CareerHub.Api.Models;

namespace CareerHub.Api.Services;

/// <summary>
/// Read contract over job listings. Defined as an async surface from day one
/// so the endpoint layer never has to change when a real data store
/// (EF Core / PostgreSQL) replaces the in-memory implementation.
/// </summary>
public interface IJobService
{
    Task<IReadOnlyList<JobListing>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<JobListing?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
}
