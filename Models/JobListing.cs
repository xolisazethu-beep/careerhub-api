namespace CareerHub.Api.Models;

/// <summary>
/// Represents a single job posting on the CareerHub platform.
/// Implemented as a record so equality is value-based and the type
/// stays immutable — useful for an in-memory store we don't mutate.
/// </summary>
public record JobListing(
    int Id,
    string Title,
    string Description,
    string Company,
    string Location,
    string Type
);
