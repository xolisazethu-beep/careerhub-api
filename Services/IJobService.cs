using CareerHub.Api.Models;

namespace CareerHub.Api.Services;

public interface IJobService
{
    Task<IEnumerable<JobListing>> GetAllAsync();
    Task<JobListing?> GetByIdAsync(Guid id);
    Task<JobListing> AddAsync(JobListing job);
    Task<JobListing?> UpdateAsync(Guid id, JobListing replacement);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> ExistsByTitleAndCompanyAsync(string title, string company, Guid? excludeId = null);
}
