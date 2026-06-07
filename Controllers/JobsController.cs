using CareerHub.Api.DTOs;
using CareerHub.Api.Models;
using CareerHub.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CareerHub.Api.Controllers;

// HTTP only. Every action does exactly three things: parse the request, call one
// service method, return a response. No EF Core, no business-rule if-statements,
// no entity construction, no try/catch — the GlobalExceptionHandler maps domain
// exceptions to status codes. (Part 4.)
[ApiController]
[Route("api/jobs")]
public class JobsController(IJobListingService jobs) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetActive() =>
        Ok(await jobs.GetActiveListingsAsync());

    // GET /api/jobs/search?location=&skill=&minExperience=&jobType=&q=&page=&pageSize=
    // Every parameter is optional; the binder defaults page/pageSize. The action
    // only packs the query into a filter and calls one service method — all
    // filtering, validation and paging live behind that call.
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string? location,
        [FromQuery] string? skill,
        [FromQuery] int? minExperience,
        [FromQuery] JobType? jobType,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20) =>
        Ok(await jobs.SearchAsync(
            new JobSearchFilter(location, skill, minExperience, jobType, q, page, pageSize)));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id) =>
        Ok(await jobs.GetByIdAsync(id));

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create(CreateJobRequest request)
    {
        var created = await jobs.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Update(Guid id, UpdateJobRequest request) =>
        Ok(await jobs.UpdateAsync(id, request));

    [HttpPost("{id:guid}/close")]
    [Authorize]
    public async Task<IActionResult> Close(Guid id)
    {
        await jobs.CloseAsync(id);
        return NoContent();
    }
}
