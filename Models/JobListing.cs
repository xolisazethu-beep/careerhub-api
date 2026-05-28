namespace CareerHub.Api.Models;

public record JobListing(
    int Id,
    string Title,
    string Description,
    string Company,
    string Location,
    JobType Type,
    decimal? SalaryMin,
    decimal? SalaryMax,
    DateTime PostedAt,
    bool IsActive
);