using CareerHub.Api.Models;
using CareerHub.Api.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerHub.Api.Endpoints;

/// <summary>
/// Maps all routes under the /jobs resource. Kept in its own file so
/// <c>Program.cs</c> stays a thin composition root.
/// </summary>
public static class JobEndpoints
{
    public static IEndpointRouteBuilder MapJobEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/jobs")
            .WithTags("Jobs");

        group.MapGet("/", GetAllJobs)
            .WithName("GetAllJobs")
            .WithSummary("Returns all available job listings.")
            .WithDescription("Returns the full collection of job postings currently on the CareerHub platform.");

        group.MapGet("/{id:int}", GetJobById)
            .WithName("GetJobById")
            .WithSummary("Returns a single job listing by its ID.")
            .WithDescription("Returns 200 OK with the matching job, or 404 Not Found if no listing exists for the supplied id.");

        return app;
    }

    // GET /jobs
    private static async Task<Ok<IReadOnlyList<JobListing>>> GetAllJobs(
        IJobService jobService,
        CancellationToken cancellationToken)
    {
        var jobs = await jobService.GetAllAsync(cancellationToken);
        return TypedResults.Ok(jobs);
    }

    // GET /jobs/{id}
    // The Results<Ok<T>, NotFound> return type lets Microsoft.AspNetCore.OpenApi
    // discover both response shapes automatically — no .Produces<T>() boilerplate needed.
    private static async Task<Results<Ok<JobListing>, NotFound>> GetJobById(
        int id,
        IJobService jobService,
        CancellationToken cancellationToken)
    {
        var job = await jobService.GetByIdAsync(id, cancellationToken);

        return job is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(job);
    }
}
