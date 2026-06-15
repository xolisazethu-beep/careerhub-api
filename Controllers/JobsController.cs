using CareerHub.Api.Data;
using CareerHub.Api.DTOs;
using CareerHub.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Controllers;

[ApiController]
[Route("api/v1/jobs")]
public class JobsController(CareerHubDbContext db) : ControllerBase
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    [HttpGet]
    [EndpointSummary("List job listings")]
    [EndpointDescription("Returns a paged list of active job listings. The total number of matching records is returned in the X-Total-Count response header. The default page size is 20 (maximum 100). Sort options: postedAt, title, company. Prefix a sort field with '-' for descending order (for example sort=-postedAt). The default sort is -postedAt.")]
    public async Task<ActionResult<IEnumerable<JobListingDto>>> GetJobs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize,
        [FromQuery] string sort = "-postedAt",
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > MaxPageSize ? DefaultPageSize : pageSize;

        var query = ApplySort(db.JobListings.Where(j => j.IsActive), sort);

        var total = await query.CountAsync(ct);
        Response.Headers["X-Total-Count"] = total.ToString();

        var jobs = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(j => new JobListingDto(
                j.Id, j.Title, j.Company, j.Location, j.Description,
                j.SalaryMin, j.SalaryMax, j.PostedAt, j.ExpiresAt, j.IsActive))
            .ToListAsync(ct);

        return Ok(jobs);
    }

    [HttpGet("search")]
    [EnableRateLimiting("search")]
    [EndpointSummary("Search job listings")]
    [EndpointDescription("Searches active job listings by title, company, or location. This endpoint is rate limited to 10 requests per minute using a fixed 1-minute window per client. Requests that exceed the limit receive 429 Too Many Requests.")]
    public async Task<ActionResult<IEnumerable<JobListingDto>>> Search(
        [FromQuery] string q = "",
        CancellationToken ct = default)
    {
        var term = (q ?? string.Empty).Trim();
        var query = db.JobListings.Where(j => j.IsActive);

        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            query = query.Where(j =>
                EF.Functions.ILike(j.Title, pattern) ||
                EF.Functions.ILike(j.Company, pattern) ||
                EF.Functions.ILike(j.Location, pattern));
        }

        var results = await query
            .OrderByDescending(j => j.PostedAt)
            .Take(MaxPageSize)
            .Select(j => new JobListingDto(
                j.Id, j.Title, j.Company, j.Location, j.Description,
                j.SalaryMin, j.SalaryMax, j.PostedAt, j.ExpiresAt, j.IsActive))
            .ToListAsync(ct);

        return Ok(results);
    }

    [HttpGet("{id:int}")]
    [EndpointSummary("Get a job listing by id")]
    [EndpointDescription("Returns a single job listing. Each response carries a strong ETag. A client may issue a conditional request by sending If-None-Match with a previously returned ETag; if the listing is unchanged the endpoint returns 304 Not Modified with no body, otherwise it returns 200 with the listing. Returns 404 if the listing does not exist.")]
    public async Task<ActionResult<JobListingDto>> GetById(int id, CancellationToken ct = default)
    {
        var job = await db.JobListings.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (job is null)
            return NotFound();

        var etag = ComputeETag(job);

        var ifNoneMatch = Request.Headers.IfNoneMatch.ToString();
        if (!string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch == etag)
            return StatusCode(StatusCodes.Status304NotModified);

        Response.Headers.ETag = etag;
        return Ok(ToDto(job));
    }

    [HttpPost]
    [EndpointSummary("Create a job listing")]
    public async Task<ActionResult<JobListingDto>> Create(CreateJobRequest request, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var job = new JobListing
        {
            Title = request.Title,
            Company = request.Company,
            Location = request.Location,
            Description = request.Description,
            SalaryMin = request.SalaryMin,
            SalaryMax = request.SalaryMax,
            PostedAt = now,
            ExpiresAt = request.ExpiresAt ?? now.AddDays(30),
            UpdatedAt = now,
            IsActive = true
        };

        db.JobListings.Add(job);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = job.Id }, ToDto(job));
    }

    private static IQueryable<JobListing> ApplySort(IQueryable<JobListing> query, string sort)
    {
        var descending = sort.StartsWith('-');
        var field = sort.TrimStart('-').ToLowerInvariant();

        return field switch
        {
            "title" => descending ? query.OrderByDescending(j => j.Title) : query.OrderBy(j => j.Title),
            "company" => descending ? query.OrderByDescending(j => j.Company) : query.OrderBy(j => j.Company),
            _ => descending ? query.OrderByDescending(j => j.PostedAt) : query.OrderBy(j => j.PostedAt)
        };
    }

    private static string ComputeETag(JobListing job) =>
        $"\"{job.Id}-{job.UpdatedAt.UtcTicks}\"";

    private static JobListingDto ToDto(JobListing j) =>
        new(j.Id, j.Title, j.Company, j.Location, j.Description,
            j.SalaryMin, j.SalaryMax, j.PostedAt, j.ExpiresAt, j.IsActive);
}
