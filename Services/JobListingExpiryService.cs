using CareerHub.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Services;

public sealed class JobListingExpiryService(
    IServiceScopeFactory scopeFactory,
    ILogger<JobListingExpiryService> logger) : BackgroundService
{
    private static readonly TimeSpan Period = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CloseExpiredListingsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "JobListingExpiryService run failed; retrying next cycle.");
            }

            try
            {
                await Task.Delay(Period, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task CloseExpiredListingsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CareerHubDbContext>();

        var now = DateTimeOffset.UtcNow;

        var expired = await db.JobListings
            .Where(j => j.IsActive && j.ExpiresAt < now)
            .ToListAsync(ct);

        if (expired.Count == 0)
        {
            logger.LogInformation("JobListingExpiryService: no expired listings to close.");
            return;
        }

        foreach (var listing in expired)
        {
            listing.IsActive = false;
            listing.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("JobListingExpiryService: closed {Count} expired listing(s).", expired.Count);
    }
}
