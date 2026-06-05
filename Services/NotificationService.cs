namespace CareerHub.Api.Services;

using CareerHub.Api.Controllers;
using CareerHub.Api.Data;
using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

public interface INotificationService
{
    Task SendApplicationRejectionAsync(Guid jobListingId, Guid applicantId, string reason = "");
    Task SendApplicationApprovedAsync(Guid jobListingId, Guid applicantId);
    Task SendInterviewInvitationAsync(Guid jobListingId, Guid applicantId, DateTime interviewDate);
}

public class NotificationService : INotificationService
{
    private readonly CareerHubDbContext _context;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(CareerHubDbContext context, ILogger<NotificationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SendApplicationRejectionAsync(Guid jobListingId, Guid applicantId, string reason = "")
    {
        try
        {
            var application = await _context.Applications
                .Include(a => a.Applicant)
                .Include(a => a.JobListing)
                .FirstOrDefaultAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

            if (application == null)
                return;

            var subject = $"Application Status Update - {application.JobListing.Title}";
            var message = $@"
Dear {application.Applicant.FullName},

Thank you for your interest in the {application.JobListing.Title} position at our company.

Unfortunately, we regret to inform you that your application has not been selected to move forward at this time.
{(string.IsNullOrEmpty(reason) ? "" : $"Reason: {reason}")}

We appreciate your time and encourage you to apply for other positions in the future.

Best regards,
Career Hub Team
";

            await LogNotification(application.Applicant.Email, subject, message, NotificationType.Rejection);
            _logger.LogInformation($"Rejection notification sent to {application.Applicant.Email} for job {application.JobListing.Title}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending rejection notification: {ex.Message}");
        }
    }

    public async Task SendApplicationApprovedAsync(Guid jobListingId, Guid applicantId)
    {
        try
        {
            var application = await _context.Applications
                .Include(a => a.Applicant)
                .Include(a => a.JobListing)
                .FirstOrDefaultAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

            if (application == null)
                return;

            var subject = $"Great News! - {application.JobListing.Title} Position";
            var message = $@"
Dear {application.Applicant.FullName},

Congratulations! We are pleased to inform you that your application for the {application.JobListing.Title} position has been approved.

We look forward to the next steps in the hiring process.

Best regards,
Career Hub Team
";

            await LogNotification(application.Applicant.Email, subject, message, NotificationType.Approval);
            _logger.LogInformation($"Approval notification sent to {application.Applicant.Email} for job {application.JobListing.Title}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending approval notification: {ex.Message}");
        }
    }

    public async Task SendInterviewInvitationAsync(Guid jobListingId, Guid applicantId, DateTime interviewDate)
    {
        try
        {
            var application = await _context.Applications
                .Include(a => a.Applicant)
                .Include(a => a.JobListing)
                .FirstOrDefaultAsync(a => a.JobListingId == jobListingId && a.ApplicantId == applicantId);

            if (application == null)
                return;

            var subject = $"Interview Invitation - {application.JobListing.Title}";
            var message = $@"
Dear {application.Applicant.FullName},

You are invited to an interview for the {application.JobListing.Title} position.

Interview Date: {interviewDate:MMMM dd, yyyy - HH:mm}

Please confirm your availability.

Best regards,
Career Hub Team
";

            await LogNotification(application.Applicant.Email, subject, message, NotificationType.Interview);
            _logger.LogInformation($"Interview invitation sent to {application.Applicant.Email}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending interview invitation: {ex.Message}");
        }
    }

    private async Task LogNotification(string recipientEmail, string subject, string message, NotificationType type)
    {
        // TODO: Implement actual email sending or in-app notification storage
        // For now, we're just logging to console and database
        Console.WriteLine($"\n=== NOTIFICATION ===");
        Console.WriteLine($"To: {recipientEmail}");
        Console.WriteLine($"Type: {type}");
        Console.WriteLine($"Subject: {subject}");
        Console.WriteLine($"Message: {message}");
        Console.WriteLine($"Timestamp: {DateTime.UtcNow}");
        Console.WriteLine("===================\n");
    }
}

public enum NotificationType
{
    Rejection,
    Approval,
    Interview,
    StatusUpdate,
    General
}
