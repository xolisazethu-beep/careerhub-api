using System.Security.Claims;
using CareerHub.Api.DTOs;
using CareerHub.Api.Services;

namespace CareerHub.Api.Endpoints;

public static class JobEndpoints
{
    public static void MapJobEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/jobs").WithTags("Jobs");

        // GET endpoints stay public so anyone can browse listings.

        // GET /api/jobs  -> one-query list (projection)
        group.MapGet("/", async (IJobService service) =>
            Results.Ok(await service.GetAllAsync()));

        // GET /api/jobs/{id}  -> detail with company + applications
        group.MapGet("/{id:guid}", async (Guid id, IJobService service) =>
        {
            var job = await service.GetByIdAsync(id);
            return job is null ? Results.NotFound() : Results.Ok(job);
        });

        // POST /api/jobs  -> create a listing (requires a logged-in caller)
        group.MapPost("/", async (CreateJobRequest request, IJobService service) =>
        {
            var created = await service.CreateAsync(request);
            return Results.Created($"/api/jobs/{created.Id}", created);
        }).RequireAuthorization();

        // POST /api/jobs/{id}/applications  -> submit an application.
        // RequireAuthorization() rejects anonymous callers with 401.
        // The applicant's identity comes from the JWT (ClaimsPrincipal),
        // NOT from the request body.
        group.MapPost("/{id:guid}/applications", async (
            Guid id, CreateApplicationRequest request, ClaimsPrincipal user, IJobService service) =>
        {
            var applicantId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var application = await service.ApplyAsync(id, applicantId, request);
            return Results.Created($"/api/jobs/{id}/applications/{application.ApplicantId}", application);
        }).RequireAuthorization();
    }
}
