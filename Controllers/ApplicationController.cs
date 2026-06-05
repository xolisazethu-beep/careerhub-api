namespace CareerHub.Api.Controllers;

using Microsoft.AspNetCore.Mvc;
using CareerHub.Api.Data;
using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class ApplicationController : ControllerBase
{
    private readonly CareerHubDbContext _context;

    public ApplicationController(CareerHubDbContext context)
    {
        _context = context;
    }

    // GET: api/application/{jobListingId}/{applicantId}
    // Search for an application using job listing ID and applicant ID
    [HttpGet("{jobListingId}/{applicantId}")]
    public async Task<ActionResult<ApplicationDto>> GetApplicationById(Guid jobListingId, Guid applicantId)
    {
        var application = await _context.Applications
            .Include(a => a.JobListing)
            .Include(a => a.Applicant)
            .FirstOrDefaultAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

        if (application == null)
            return NotFound(new { message = "Application not found" });

        return Ok(MapToDto(application));
    }

    // GET: api/application/applicant/{applicantId}
    // Get all applications for a specific applicant
    [HttpGet("applicant/{applicantId}")]
    public async Task<ActionResult<List<ApplicationDto>>> GetApplicantApplications(Guid applicantId)
    {
        var applications = await _context.Applications
            .Where(a => a.ApplicantId == applicantId)
            .Include(a => a.JobListing)
            .Include(a => a.Applicant)
            .ToListAsync();

        if (!applications.Any())
            return NotFound(new { message = "No applications found for this applicant" });

        return Ok(applications.Select(MapToDto).ToList());
    }

    // GET: api/application/status/{jobListingId}/{applicantId}
    // Get the status of a specific application
    [HttpGet("status/{jobListingId}/{applicantId}")]
    public async Task<ActionResult<object>> GetApplicationStatus(Guid jobListingId, Guid applicantId)
    {
        var application = await _context.Applications
            .FirstOrDefaultAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

        if (application == null)
            return NotFound(new { message = "Application not found" });

        return Ok(new
        {
            jobListingId = application.JobListingId,
            applicantId = application.ApplicantId,
            status = application.Status.ToString(),
            submittedAt = application.SubmittedAt,
            statusUpdatedAt = application.StatusUpdatedAt
        });
    }

    // DELETE: api/application/{jobListingId}/{applicantId}
    // Remove/withdraw an application
    [HttpDelete("{jobListingId}/{applicantId}")]
    public async Task<IActionResult> RemoveApplication(Guid jobListingId, Guid applicantId)
    {
        var application = await _context.Applications
            .FirstOrDefaultAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

        if (application == null)
            return NotFound(new { message = "Application not found" });

        _context.Applications.Remove(application);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Application removed successfully" });
    }

    // PUT: api/application/{jobListingId}/{applicantId}/status
    // Update application status
    [HttpPut("{jobListingId}/{applicantId}/status")]
    public async Task<IActionResult> UpdateApplicationStatus(
        Guid jobListingId,
        Guid applicantId,
        [FromBody] UpdateStatusRequest request)
    {
        var application = await _context.Applications
            .FirstOrDefaultAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

        if (application == null)
            return NotFound(new { message = "Application not found" });

        var previousStatus = application.Status;
        application.Status = Enum.Parse<ApplicationStatus>(request.Status);
        application.StatusUpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // If rejected, send notification (implement notification service)
        if (application.Status == ApplicationStatus.Rejected && previousStatus != ApplicationStatus.Rejected)
        {
            await SendRejectionNotification(application);
        }

        return Ok(new { message = "Application status updated successfully", application = MapToDto(application) });
    }

    private async Task SendRejectionNotification(Application application)
    {
        var applicant = await _context.Applicants.FindAsync(application.ApplicantId);
        var jobListing = await _context.JobListings.FindAsync(application.JobListingId);

        if (applicant != null && jobListing != null)
        {
            Console.WriteLine($"NOTIFICATION: Application rejected for {applicant.Email} - Job: {jobListing.Title}");
        }
    }

    private ApplicationDto MapToDto(Application app) => new()
    {
        JobListingId = app.JobListingId,
        ApplicantId = app.ApplicantId,
        JobTitle = app.JobListing?.Title ?? string.Empty,
        ApplicantName = app.Applicant?.FullName ?? string.Empty,
        ApplicantEmail = app.Applicant?.Email ?? string.Empty,
        Status = app.Status.ToString(),
        SubmittedAt = app.SubmittedAt,
        StatusUpdatedAt = app.StatusUpdatedAt,
        CoverNote = app.CoverNote
    };

    public class ApplicationDto
    {
        public Guid JobListingId { get; set; }
        public Guid ApplicantId { get; set; }
        public required string JobTitle { get; set; }
        public required string ApplicantName { get; set; }
        public required string ApplicantEmail { get; set; }
        public required string Status { get; set; }
        public DateTime SubmittedAt { get; set; }
        public DateTime? StatusUpdatedAt { get; set; }
        public required string CoverNote { get; set; }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
