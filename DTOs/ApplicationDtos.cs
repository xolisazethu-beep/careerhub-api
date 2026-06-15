using CareerHub.Api.Models;

namespace CareerHub.Api.DTOs;

public record ApplicationDto(
    int Id,
    int JobListingId,
    string ApplicantName,
    string ApplicantEmail,
    ApplicationStatus Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset UpdatedAt);

public record CreateApplicationRequest(
    int JobListingId,
    string ApplicantName,
    string ApplicantEmail);

public record UpdateApplicationStatusRequest(ApplicationStatus Status);
