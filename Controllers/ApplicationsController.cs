using CareerHub.Api.Data;
using CareerHub.Api.DTOs;
using CareerHub.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Controllers;

[ApiController]
[Route("api/v1/applications")]
public class ApplicationsController(CareerHubDbContext db) : ControllerBase
{
    [HttpGet("{id:int}")]
    [EndpointSummary("Get an application by id")]
    public async Task<ActionResult<ApplicationDto>> GetById(int id, CancellationToken ct = default)
    {
        var application = await db.Applications.FirstOrDefaultAsync(a => a.Id == id, ct);
        return application is null ? NotFound() : Ok(ToDto(application));
    }

    [HttpPost]
    [EndpointSummary("Submit an application")]
    public async Task<ActionResult<ApplicationDto>> Create(CreateApplicationRequest request, CancellationToken ct = default)
    {
        var jobExists = await db.JobListings.AnyAsync(j => j.Id == request.JobListingId, ct);
        if (!jobExists)
            return NotFound($"Job listing {request.JobListingId} does not exist.");

        var now = DateTimeOffset.UtcNow;
        var application = new Application
        {
            JobListingId = request.JobListingId,
            ApplicantName = request.ApplicantName,
            ApplicantEmail = request.ApplicantEmail,
            Status = ApplicationStatus.Submitted,
            SubmittedAt = now,
            UpdatedAt = now
        };

        db.Applications.Add(application);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = application.Id }, ToDto(application));
    }

    [HttpPatch("{id:int}/status")]
    [EndpointSummary("Update application status")]
    [EndpointDescription("Transitions an application to a new status. Legal transitions are: Submitted to UnderReview, Rejected, or Withdrawn; UnderReview to Interview, Rejected, or Withdrawn; Interview to Offer, Rejected, or Withdrawn; Offer to Accepted, Rejected, or Withdrawn. Accepted, Rejected, and Withdrawn are terminal states. An illegal transition returns 409 Conflict with the list of allowed targets; an unknown application returns 404 Not Found.")]
    public async Task<ActionResult<ApplicationDto>> UpdateStatus(
        int id,
        UpdateApplicationStatusRequest request,
        CancellationToken ct = default)
    {
        var application = await db.Applications.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (application is null)
            return NotFound();

        if (application.Status == request.Status)
            return Ok(ToDto(application));

        if (!ApplicationStatusTransitions.IsValid(application.Status, request.Status))
        {
            return Conflict(new
            {
                error = "Illegal status transition.",
                from = application.Status.ToString(),
                attempted = request.Status.ToString(),
                allowed = ApplicationStatusTransitions.AllowedFrom(application.Status).Select(s => s.ToString())
            });
        }

        application.Status = request.Status;
        application.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(ToDto(application));
    }

    private static ApplicationDto ToDto(Application a) =>
        new(a.Id, a.JobListingId, a.ApplicantName, a.ApplicantEmail, a.Status, a.SubmittedAt, a.UpdatedAt);
}
