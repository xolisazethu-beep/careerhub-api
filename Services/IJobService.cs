using CareerHub.Api.DTOs;

namespace CareerHub.Api.Services;

public interface IJobService
{
    Task<List<JobListingResponse>> GetAllAsync();
    Task<JobDetailResponse?> GetByIdAsync(Guid id);
    Task<JobDetailResponse> CreateAsync(CreateJobRequest request);

    // applicantId now comes from the authenticated caller's JWT, not the body.
    Task<ApplicationResponse> ApplyAsync(Guid jobId, Guid applicantId, CreateApplicationRequest request);
}
