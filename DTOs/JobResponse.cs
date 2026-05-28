using CareerHub.Api.Models;

namespace CareerHub.Api.DTOs;

public record JobResponse(
    int Id,
    string Title,
    string Company,
    string Location,
    string Description,
    JobType Type,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string SalaryDisplay,
    DateTime PostedAt,
    bool IsActive
);