using System.Security.Claims;
using CareerHub.Api.DTOs;
using CareerHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerHub.Api.Controllers;

// HTTP only. The applicant's identity always comes from the JWT (CurrentApplicantId),
// never from the request body, so a caller cannot act as someone else.
[ApiController]
public class ApplicationsController(IApplicationService applications) : ControllerBase
{
    // Submit an application to a listing.
    [HttpPost("api/jobs/{jobId:guid}/applications")]
    [Authorize]
    public async Task<IActionResult> Apply(Guid jobId, CreateApplicationRequest request)
    {
        var result = await applications.ApplyAsync(jobId, CurrentApplicantId(), request);
        return Created($"/api/jobs/{jobId}/applications/{result.ApplicantId}", result);
    }

    // All applications received for a listing.
    [HttpGet("api/jobs/{jobId:guid}/applications")]
    [Authorize]
    public async Task<IActionResult> GetForListing(Guid jobId) =>
        Ok(await applications.GetForListingAsync(jobId));

    // The current applicant's own applications.
    [HttpGet("api/applications/mine")]
    [Authorize]
    public async Task<IActionResult> GetMine() =>
        Ok(await applications.GetMineAsync(CurrentApplicantId()));

    // Move an application to a new status (validated against the transition policy).
    [HttpPatch("api/jobs/{jobId:guid}/applications/{applicantId:guid}/status")]
    [Authorize]
    public async Task<IActionResult> ChangeStatus(Guid jobId, Guid applicantId, UpdateApplicationStatusRequest request) =>
        Ok(await applications.ChangeStatusAsync(jobId, applicantId, request.NewStatus));

    // Withdraw an application (only the owner may do this).
    [HttpDelete("api/jobs/{jobId:guid}/applications/{applicantId:guid}")]
    [Authorize]
    public async Task<IActionResult> Withdraw(Guid jobId, Guid applicantId)
    {
        await applications.WithdrawAsync(jobId, applicantId, CurrentApplicantId());
        return NoContent();
    }

    // Helper — not an action. Reads the applicant id stamped into the JWT at login.
    private Guid CurrentApplicantId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
