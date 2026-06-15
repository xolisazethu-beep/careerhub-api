namespace CareerHub.Api.DTOs;

public record JobListingDto(
    int Id,
    string Title,
    string Company,
    string Location,
    string Description,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTimeOffset PostedAt,
    DateTimeOffset ExpiresAt,
    bool IsActive);

public record CreateJobRequest(
    string Title,
    string Company,
    string Location,
    string Description,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTimeOffset? ExpiresAt);
