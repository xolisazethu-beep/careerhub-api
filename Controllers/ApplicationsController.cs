using Asp.Versioning;
using CareerHub.Api.DTOs;
using CareerHub.Api.Infrastructure;
using CareerHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Distributed;

namespace CareerHub.Api.Controllers;

// Auth is per-action here: applying and "my applications" are applicant-only,
// but the Part 5B status transition is employer-only — so a single class-level
// [Authorize(Roles=...)] (which would AND the roles) cannot express both.
// Routes are method-level absolutes (applications are nested under jobs for the
// apply action), each carrying the {version:apiVersion} segment for Part 6.
[ApiController]
[ApiVersion("1.0")]
[Authorize]
[Tags("Applications")] // EXTRA #4: OpenAPI grouping
public class ApplicationsController(IApplicationService applications, IDistributedCache cache) : ControllerBase
{
    /// <summary>
    /// Apply to a listing. The applicant is taken from the token, not the body.
    /// EXTRA #7: honours an optional <c>Idempotency-Key</c> request header — the
    /// first call with a given key (per user) performs the apply and caches the
    /// outcome for 24h; a retry with the same key replays that outcome instead of
    /// creating a duplicate, so a flaky network retry is safe.
    /// </summary>
    [HttpPost("api/v{version:apiVersion}/jobs/{jobListingId:guid}/applications")]
    [Authorize(Roles = "Applicant")]
    [EnableRateLimiting("apply")] // PART 8: fixed window, 5 per 60 minutes, partitioned by user
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Apply(Guid jobListingId, ApplyRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();
        var idempotencyKey = Request.Headers["Idempotency-Key"].ToString();

        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            await applications.ApplyAsync(userId, jobListingId, request.CoverNote, ct);
            return StatusCode(StatusCodes.Status201Created);
        }

        var cacheKey = $"idempotency:{userId}:{idempotencyKey}";
        if (await cache.GetStringAsync(cacheKey, ct) is not null)
            return StatusCode(StatusCodes.Status201Created); // replay prior outcome — no duplicate

        await applications.ApplyAsync(userId, jobListingId, request.CoverNote, ct);
        await cache.SetStringAsync(cacheKey, "201",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) }, ct);
        return StatusCode(StatusCodes.Status201Created);
    }

    /// <summary>The signed-in applicant's own application history.</summary>
    [HttpGet("api/v{version:apiVersion}/applications/me")]
    [Authorize(Roles = "Applicant")]
    public async Task<IReadOnlyList<MyApplicationResponse>> Mine(CancellationToken ct)
        => await applications.GetMineAsync(User.GetUserId(), ct);

    /// <summary>
    /// PART 7: a single application by composite key. Returns a strong ETag
    /// (SHA256 of JobListingId:ApplicantId:Status) and honours If-None-Match with a
    /// 304. Authenticated users only.
    /// </summary>
    [HttpGet("api/v{version:apiVersion}/applications/{jobListingId:guid}/{applicantId:guid}")]
    public async Task<IActionResult> GetById(Guid jobListingId, Guid applicantId, CancellationToken ct)
    {
        var application = await applications.GetAsync(jobListingId, applicantId, ct);
        if (application is null)
            return NotFound();

        var etag = EtagHelper.Compute(application.JobListingId, application.ApplicantId, application.Status);
        if (Request.Headers.IfNoneMatch == etag)
            return StatusCode(StatusCodes.Status304NotModified);

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "private, must-revalidate";
        return Ok(application);
    }

    /// <summary>
    /// PART 5B: transition an application's status, enforcing the legal-transition
    /// state machine (illegal moves → 400). Employer-only. Applications are
    /// identified by their composite key (jobListingId, applicantId) since the
    /// entity has no surrogate id. One line → service.
    /// </summary>
    [HttpPatch("api/v{version:apiVersion}/applications/{jobListingId:guid}/{applicantId:guid}/status")]
    [Authorize(Roles = "Employer")]
    public async Task<IActionResult> UpdateStatus(
        Guid jobListingId, Guid applicantId, UpdateApplicationStatusRequest request, CancellationToken ct)
    {
        await applications.UpdateStatusAsync(jobListingId, applicantId, request.Status, ct);
        return NoContent();
    }
}
