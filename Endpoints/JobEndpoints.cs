using CareerHub.Api.DTOs;
using CareerHub.Api.Models;
using CareerHub.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerHub.Api.Endpoints;

public static class JobEndpoints
{
    public static IEndpointRouteBuilder MapJobEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/jobs").WithTags("Jobs");

        group.MapGet("/", GetAllJobs)
            .WithName("GetAllJobs")
            .WithSummary("Returns all available job listings.");

        group.MapGet("/{id:guid}", GetJobById)
            .WithName("GetJobById")
            .WithSummary("Returns a single job listing by its ID.");

        group.MapPost("/", CreateJob)
            .WithName("CreateJob")
            .WithSummary("Creates a new job listing.");

        group.MapPut("/{id:guid}", UpdateJob)
            .WithName("UpdateJob")
            .WithSummary("Fully replaces an existing job listing.");

        group.MapDelete("/{id:guid}", DeleteJob)
            .WithName("DeleteJob")
            .WithSummary("Deletes a job listing.");

        return app;
    }

    // GET /jobs
    private static async Task<Ok<IEnumerable<JobResponse>>> GetAllJobs(
        IJobService jobService,
        CancellationToken cancellationToken)
    {
        var jobs = await jobService.GetAllAsync();
        return TypedResults.Ok(jobs.Select(j => j.ToResponse()));
    }

    // GET /jobs/{id}
    private static async Task<Results<Ok<JobResponse>, NotFound>> GetJobById(
        Guid id,
        IJobService jobService,
        CancellationToken cancellationToken)
    {
        var job = await jobService.GetByIdAsync(id);
        return job is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(job.ToResponse());
    }

    // POST /jobs
    private static async Task<Results<Created<JobResponse>, Conflict<string>, ValidationProblem>> CreateJob(
        CreateJobRequest request,
        IJobService jobService,
        CancellationToken cancellationToken)
    {
        if (!MinimalApiValidation.TryValidate(request, out var errors))
            return TypedResults.ValidationProblem(errors);

        if (await jobService.ExistsByTitleAndCompanyAsync(request.Title, request.Company))
            return TypedResults.Conflict("A job with the same title and company already exists.");

        var job = new JobListing
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Company = request.Company,
            Location = request.Location,
            Description = request.Description,
            Type = request.Type,
            SalaryMin = request.SalaryMin,
            SalaryMax = request.SalaryMax,
            PostedAt = DateTime.UtcNow,
            IsActive = true
        };

        var created = await jobService.AddAsync(job);
        return TypedResults.Created($"/jobs/{created.Id}", created.ToResponse());
    }

    // PUT /jobs/{id}
    private static async Task<Results<Ok<JobResponse>, NotFound, Conflict<string>, ValidationProblem>> UpdateJob(
        Guid id,
        UpdateJobRequest request,
        IJobService jobService,
        CancellationToken cancellationToken)
    {
        if (!MinimalApiValidation.TryValidate(request, out var errors))
            return TypedResults.ValidationProblem(errors);

        if (await jobService.ExistsByTitleAndCompanyAsync(request.Title, request.Company, excludeId: id))
            return TypedResults.Conflict("Another job with the same title and company already exists.");

        var replacement = new JobListing
        {
            Id = id,
            Title = request.Title,
            Company = request.Company,
            Location = request.Location,
            Description = request.Description,
            Type = request.Type,
            SalaryMin = request.SalaryMin,
            SalaryMax = request.SalaryMax
        };

        var updated = await jobService.UpdateAsync(id, replacement);
        return updated is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(updated.ToResponse());
    }

    // DELETE /jobs/{id}
    private static async Task<Results<NoContent, NotFound>> DeleteJob(
        Guid id,
        IJobService jobService,
        CancellationToken cancellationToken)
    {
        var deleted = await jobService.DeleteAsync(id);
        return deleted ? TypedResults.NoContent() : TypedResults.NotFound();
    }
}
