using CareerHub.Api.DTOs;

namespace CareerHub.Api.Services;

public interface IJobListingService
{
    Task<List<JobListingResponse>> GetActiveListingsAsync();
    Task<PagedResult<JobListingResponse>> SearchAsync(JobSearchFilter filter);
    Task<JobDetailResponse> GetByIdAsync(Guid id);
    Task<JobDetailResponse> CreateAsync(CreateJobRequest request);
    Task<JobDetailResponse> UpdateAsync(Guid id, UpdateJobRequest request);
    Task CloseAsync(Guid id);
}
