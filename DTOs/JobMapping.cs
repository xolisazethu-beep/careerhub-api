using CareerHub.Api.Models;

namespace CareerHub.Api.DTOs;

public static class JobMapping
{
    public static JobResponse ToResponse(this JobListing job, decimal? salaryMin, decimal? salaryMax)
        => new(
            job.Id,
            job.Title,
            job.Company,
            job.Location,
            job.Description,
            job.Type,
            salaryMin,
            salaryMax,
            BuildSalaryDisplay(salaryMin, salaryMax),
            job.PostedAt,
            job.IsActive
        );

    private static string BuildSalaryDisplay(decimal? min, decimal? max)
    {
        if (min.HasValue && max.HasValue) return $"R{min:N0} – R{max:N0}/month";
        if (min.HasValue)                  return $"From R{min:N0}/month";
        if (max.HasValue)                  return $"Up to R{max:N0}/month";
        return "Salary not specified";
    }
}