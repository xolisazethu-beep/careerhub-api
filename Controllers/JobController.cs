namespace CareerHub.Api.Controllers;

using Microsoft.AspNetCore.Mvc;
using CareerHub.Api.Data;
using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class JobController : ControllerBase
{
    private readonly CareerHubDbContext _context;

    public JobController(CareerHubDbContext context)
    {
        _context = context;
    }

    // GET: api/job/{jobListingId}
    // Get job details including salary range and requirements
    [HttpGet("{jobListingId}")]
    public async Task<ActionResult<JobDetailDto>> GetJobById(Guid jobListingId)
    {
        var job = await _context.JobListings
            .Include(j => j.Company)
            .FirstOrDefaultAsync(j => j.Id == jobListingId && j.IsActive);

        if (job == null)
            return NotFound(new { message = "Job listing not found" });

        return Ok(MapToDetailDto(job));
    }

    // GET: api/job/search
    // Search for jobs with optional filters
    [HttpGet("search")]
    public async Task<ActionResult<List<JobListingDto>>> SearchJobs(
        [FromQuery] string? title,
        [FromQuery] string? location,
        [FromQuery] decimal? minSalary,
        [FromQuery] decimal? maxSalary,
        [FromQuery] string? jobType,
        [FromQuery] bool activeOnly = true)
    {
        var query = _context.JobListings.AsQueryable();

        if (activeOnly)
            query = query.Where(j => j.IsActive);

        if (!string.IsNullOrEmpty(title))
            query = query.Where(j => j.Title.Contains(title));

        if (!string.IsNullOrEmpty(location))
            query = query.Where(j => j.Location.Contains(location));

        if (minSalary.HasValue)
            query = query.Where(j => j.SalaryMax >= minSalary || j.SalaryMax == null);

        if (maxSalary.HasValue)
            query = query.Where(j => j.SalaryMin <= maxSalary || j.SalaryMin == null);

        if (!string.IsNullOrEmpty(jobType) && Enum.TryParse<JobType>(jobType, out var type))
            query = query.Where(j => j.Type == type);

        var jobs = await query
            .Include(j => j.Company)
            .OrderByDescending(j => j.PostedAt)
            .ToListAsync();

        if (!jobs.Any())
            return NotFound(new { message = "No jobs found matching the criteria" });

        return Ok(jobs.Select(MapToListDto).ToList());
    }

    // GET: api/job/company/{companyId}
    // Get all jobs posted by a company
    [HttpGet("company/{companyId}")]
    public async Task<ActionResult<List<JobListingDto>>> GetJobsByCompany(Guid companyId)
    {
        var jobs = await _context.JobListings
            .Where(j => j.CompanyId == companyId && j.IsActive)
            .Include(j => j.Company)
            .OrderByDescending(j => j.PostedAt)
            .ToListAsync();

        if (!jobs.Any())
            return NotFound(new { message = "No jobs found for this company" });

        return Ok(jobs.Select(MapToListDto).ToList());
    }

    // GET: api/job/{jobListingId}/salary-info
    // Get detailed salary information for a job
    [HttpGet("{jobListingId}/salary-info")]
    public async Task<ActionResult<SalaryInfoDto>> GetSalaryInfo(Guid jobListingId)
    {
        var job = await _context.JobListings
            .FirstOrDefaultAsync(j => j.Id == jobListingId && j.IsActive);

        if (job == null)
            return NotFound(new { message = "Job listing not found" });

        return Ok(new SalaryInfoDto
        {
            JobTitle = job.Title,
            SalaryMin = job.SalaryMin ?? 0,
            SalaryMax = job.SalaryMax ?? 0,
            SalaryRange = $"R{job.SalaryMin:N0} - R{job.SalaryMax:N0}",
            Currency = "ZAR"
        });
    }

    // GET: api/job/{jobListingId}/requirements
    // Get job requirements (degree, diploma, experience)
    [HttpGet("{jobListingId}/requirements")]
    public async Task<ActionResult<JobRequirementsDto>> GetJobRequirements(Guid jobListingId)
    {
        var job = await _context.JobListings
            .FirstOrDefaultAsync(j => j.Id == jobListingId && j.IsActive);

        if (job == null)
            return NotFound(new { message = "Job listing not found" });

        return Ok(new JobRequirementsDto
        {
            JobTitle = job.Title,
            RequiredDegree = job.RequiredDegree,
            RequiredDiploma = job.RequiredDiploma,
            MinimumYearsExperience = job.MinimumYearsExperience,
            Description = job.Description
        });
    }

    private JobDetailDto MapToDetailDto(JobListing job) => new()
    {
        Id = job.Id,
        Title = job.Title,
        Description = job.Description,
        Location = job.Location,
        Type = job.Type.ToString(),
        SalaryMin = job.SalaryMin,
        SalaryMax = job.SalaryMax,
        SalaryRange = $"R{job.SalaryMin:N0} - R{job.SalaryMax:N0}",
        PostedAt = job.PostedAt,
        CompanyName = job.Company?.Name ?? string.Empty,
        RequiredDegree = job.RequiredDegree,
        RequiredDiploma = job.RequiredDiploma,
        MinimumYearsExperience = job.MinimumYearsExperience,
        IsActive = job.IsActive
    };

    private JobListingDto MapToListDto(JobListing job) => new()
    {
        Id = job.Id,
        Title = job.Title,
        Location = job.Location,
        Type = job.Type.ToString(),
        SalaryMin = job.SalaryMin,
        SalaryMax = job.SalaryMax,
        SalaryRange = $"R{job.SalaryMin:N0} - R{job.SalaryMax:N0}",
        CompanyName = job.Company?.Name ?? string.Empty,
        PostedAt = job.PostedAt
    };

    public class JobListingDto
    {
        public Guid Id { get; set; }
        public required string Title { get; set; }
        public required string Location { get; set; }
        public required string Type { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public required string SalaryRange { get; set; }
        public required string CompanyName { get; set; }
        public DateTime PostedAt { get; set; }
    }

    public class JobDetailDto
    {
        public Guid Id { get; set; }
        public required string Title { get; set; }
        public required string Description { get; set; }
        public required string Location { get; set; }
        public required string Type { get; set; }
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public required string SalaryRange { get; set; }
        public DateTime PostedAt { get; set; }
        public required string CompanyName { get; set; }
        public required string RequiredDegree { get; set; }
        public required string RequiredDiploma { get; set; }
        public int MinimumYearsExperience { get; set; }
        public bool IsActive { get; set; }
    }

    public class SalaryInfoDto
    {
        public required string JobTitle { get; set; }
        public decimal SalaryMin { get; set; }
        public decimal SalaryMax { get; set; }
        public required string SalaryRange { get; set; }
        public required string Currency { get; set; }
    }

    public class JobRequirementsDto
    {
        public required string JobTitle { get; set; }
        public required string RequiredDegree { get; set; }
        public required string RequiredDiploma { get; set; }
        public int MinimumYearsExperience { get; set; }
        public required string Description { get; set; }
    }
}
