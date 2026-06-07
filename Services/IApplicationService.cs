using CareerHub.Api.DTOs;
using CareerHub.Api.Models;

namespace CareerHub.Api.Services;

public interface IApplicationService
{
    Task<ApplicationResponse> ApplyAsync(Guid jobId, Guid applicantId, CreateApplicationRequest request);
    Task<List<ApplicationSummary>> GetForListingAsync(Guid jobId);
    Task<List<ApplicantApplicationResponse>> GetMineAsync(Guid applicantId);
    Task<ApplicationResponse> ChangeStatusAsync(Guid jobId, Guid applicantId, ApplicationStatus newStatus);
    Task WithdrawAsync(Guid jobId, Guid targetApplicantId, Guid callerApplicantId);
}
