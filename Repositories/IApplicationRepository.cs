using CareerHub.Api.DTOs;
using CareerHub.Api.Models;

namespace CareerHub.Api.Repositories;

public interface IApplicationRepository
{
    // Yes/no check — named, returns bool. This is what lets the service reject a
    // duplicate WITHOUT a second INSERT ever reaching the database (proof step 2).
    Task<bool> HasAlreadyAppliedAsync(Guid jobListingId, Guid applicantId);

    // Read — projected DTOs.

    // All applications received for one listing (applicant name + status).
    Task<List<ApplicationSummary>> GetApplicationsForListingAsync(Guid jobListingId);

    // All applications a given applicant has submitted (which listings, statuses).
    Task<List<ApplicantApplicationResponse>> GetApplicationsByApplicantAsync(Guid applicantId);

    // The tracked domain entity for one application, used by the service to apply a
    // status change or a withdrawal. Returns null if it does not exist.
    Task<Application?> GetApplicationAsync(Guid jobListingId, Guid applicantId);

    // Write — accept the domain entity and persist internally.

    Task AddApplicationAsync(Application application);
    Task UpdateApplicationAsync(Application application);
}
