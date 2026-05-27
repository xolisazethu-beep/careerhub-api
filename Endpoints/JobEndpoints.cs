using System.ComponentModel.DataAnnotations;
using CareerHub.Api.DTOs;
using CareerHub.Api.Models;
using CareerHub.Api.Services;

namespace CareerHub.Api.Endpoints;

public static class JobEndpoints
{
    public static void MapJobEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/jobs").WithTags("Jobs");

        // ----- GET /jobs -----
        group.MapGet("/", (IJobService service) =>
        {
            var jobs = service.GetAll().Select(j => j.ToResponse(j.SalaryMin, j.SalaryMax));
            return Results.Ok(jobs);
        })
        .WithName("GetAllJobs");

        // ----- GET /jobs/{id} -----
        group.MapGet("/{id:int}", (int id, IJobService service) =>
        {
            var job = service.GetById(id);
            return job is null
                ? Results.Problem(
                    title: "Job not found",
                    detail: $"No job exists with id {id}.",
                    statusCode: StatusCodes.Status404NotFound,
                    type: "https://example.com/probs/job-not-found")
                : Results.Ok(job.ToResponse(job.SalaryMin, job.SalaryMax));
        })
        .WithName("GetJobById");

        // ----- POST /jobs -----
        group.MapPost("/", (CreateJobRequest request, IJobService service) =>
        {
            var validationResults = new List<ValidationResult>();
            var context = new ValidationContext(request);
            if (!Validator.TryValidateObject(request, context, validationResults, validateAllProperties: true))
            {
                var errors = validationResults
                    .SelectMany(r => r.MemberNames.DefaultIfEmpty(""), (r, m) => new { Member = m, r.ErrorMessage })
                    .GroupBy(x => x.Member)
                    .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage ?? "").ToArray());
                return Results.ValidationProblem(errors);
            }

            if (service.ExistsByTitleAndCompany(request.Title, request.Company))
            {
                return Results.Problem(
                    title: "Duplicate job",
                    detail: $"A job titled '{request.Title}' at '{request.Company}' already exists.",
                    statusCode: StatusCodes.Status409Conflict,
                    type: "https://example.com/probs/duplicate-job");
            }

            var job = new JobListing(
                Id: 0,
                Title: request.Title,
                Description: request.Description,
                Company: request.Company,
                Location: request.Location,
                Type: request.Type,
                SalaryMin: request.SalaryMin,
                SalaryMax: request.SalaryMax,
                PostedAt: DateTime.UtcNow,
                IsActive: true
            );

            var saved = service.Add(job);
            var response = saved.ToResponse(saved.SalaryMin, saved.SalaryMax);
            return Results.Created($"/jobs/{saved.Id}", response);
        })
        .WithName("CreateJob");

        // ----- PUT /jobs/{id} -----
        group.MapPut("/{id:int}", (int id, UpdateJobRequest request, IJobService service) =>
        {
            var validationResults = new List<ValidationResult>();
            var context = new ValidationContext(request);
            if (!Validator.TryValidateObject(request, context, validationResults, validateAllProperties: true))
            {
                var errors = validationResults
                    .SelectMany(r => r.MemberNames.DefaultIfEmpty(""), (r, m) => new { Member = m, r.ErrorMessage })
                    .GroupBy(x => x.Member)
                    .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage ?? "").ToArray());
                return Results.ValidationProblem(errors);
            }

            var existing = service.GetById(id);
            if (existing is null)
            {
                return Results.Problem(
                    title: "Job not found",
                    detail: $"No job exists with id {id}.",
                    statusCode: StatusCodes.Status404NotFound,
                    type: "https://example.com/probs/job-not-found");
            }

            if (service.ExistsByTitleAndCompany(request.Title, request.Company, excludeId: id))
            {
                return Results.Problem(
                    title: "Duplicate job",
                    detail: $"Another job titled '{request.Title}' at '{request.Company}' already exists.",
                    statusCode: StatusCodes.Status409Conflict,
                    type: "https://example.com/probs/duplicate-job");
            }

            var replacement = existing with
            {
                Title = request.Title,
                Description = request.Description,
                Company = request.Company,
                Location = request.Location,
                Type = request.Type,
                SalaryMin = request.SalaryMin,
                SalaryMax = request.SalaryMax
            };

            var updated = service.Update(id, replacement)!;
            return Results.Ok(updated.ToResponse(updated.SalaryMin, updated.SalaryMax));
        })
        .WithName("UpdateJob");

        // ----- DELETE /jobs/{id} -----
        group.MapDelete("/{id:int}", (int id, IJobService service) =>
        {
            if (!service.Delete(id))
            {
                return Results.Problem(
                    title: "Job not found",
                    detail: $"No job exists with id {id}.",
                    statusCode: StatusCodes.Status404NotFound,
                    type: "https://example.com/probs/job-not-found");
            }
            return Results.NoContent();
        })
        .WithName("DeleteJob");
    }
}