namespace CareerHub.Api.Models;


public record JobListing(
    int Id,
    string Title,
    string Description,
    string Company,
    string Location,
    JobType Type,
    DateTime PostedAt,
    bool IsActive
);