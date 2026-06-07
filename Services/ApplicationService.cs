using CareerHub.Api.Domain;
using CareerHub.Api.DTOs;
using CareerHub.Api.Exceptions;
using CareerHub.Api.Models;
using CareerHub.Api.Repositories;

// NOTE: there is deliberately NO "using Microsoft.EntityFrameworkCore;" here.
// All persistence lives behind the two repository interfaces. (Proof step 1.)

namespace CareerHub.Api.Services;

public class ApplicationService(
    IApplicationRepository applications,
    IJobListingRepository listings) : IApplicationService
{
    public async Task<ApplicationResponse> ApplyAsync(Guid jobId, Guid applicantId, CreateApplicationRequest request)
    {
        // 404 vs 409 are different outcomes, so we ask two precise questions.
        if (!await listings.ListingExistsAsync(jobId))
            throw new NotFoundException($"Job listing {jobId} does not exist.");

        // RULE: cannot apply to a listing whose closing date has passed (or that is closed).
        if (!await listings.IsOpenForApplicationsAsync(jobId))
            throw new ListingClosedException($"Job listing {jobId} is closed for applications.");

        // RULE: an applicant cannot submit a second application to the same listing.
        // This check means the duplicate is rejected WITHOUT a second INSERT. (Proof step 2.)
        if (await applications.HasAlreadyAppliedAsync(jobId, applicantId))
            throw new DuplicateApplicationException("This applicant has already applied to this listing.");

        var application = new Application
        {
            JobListingId = jobId,
            ApplicantId = applicantId,
            SubmittedAt = DateTime.UtcNow,
            Status = ApplicationStatus.Submitted,
            CoverNote = request.CoverNote ?? string.Empty
        };

        await applications.AddApplicationAsync(application);

        return ToResponse(application);
    }

    public Task<List<ApplicationSummary>> GetForListingAsync(Guid jobId) =>
        applications.GetApplicationsForListingAsync(jobId);

    public Task<List<ApplicantApplicationResponse>> GetMineAsync(Guid applicantId) =>
        applications.GetApplicationsByApplicantAsync(applicantId);

    public async Task<ApplicationResponse> ChangeStatusAsync(Guid jobId, Guid applicantId, ApplicationStatus newStatus)
    {
        var application = await applications.GetApplicationAsync(jobId, applicantId)
            ?? throw new NotFoundException("Application not found.");

        // RULE: the move must be one the workflow allows. The decision is delegated
        // to the single-source-of-truth policy, which needs no database.
        if (!ApplicationStatusPolicy.IsValidTransition(application.Status, newStatus))
            throw new InvalidStatusTransitionException(
                $"Cannot move an application from {application.Status} to {newStatus}.");

        application.Status = newStatus;
        application.StatusUpdatedAt = DateTime.UtcNow;
        await applications.UpdateApplicationAsync(application);

        return ToResponse(application);
    }

    public async Task WithdrawAsync(Guid jobId, Guid targetApplicantId, Guid callerApplicantId)
    {
        // RULE: an applicant can only withdraw their OWN application.
        if (targetApplicantId != callerApplicantId)
            throw new ForbiddenException("You can only withdraw your own application.");

        var application = await applications.GetApplicationAsync(jobId, targetApplicantId)
            ?? throw new NotFoundException("Application not found.");

        // A finished application (Offered / Rejected / already Withdrawn) cannot be withdrawn.
        if (ApplicationStatusPolicy.IsTerminal(application.Status))
            throw new InvalidStatusTransitionException(
                $"An application in state {application.Status} can no longer be withdrawn.");

        application.Status = ApplicationStatus.Withdrawn;
        application.StatusUpdatedAt = DateTime.UtcNow;
        await applications.UpdateApplicationAsync(application);
    }

    private static ApplicationResponse ToResponse(Application a) =>
        new(a.JobListingId, a.ApplicantId, a.SubmittedAt, a.Status);
}
