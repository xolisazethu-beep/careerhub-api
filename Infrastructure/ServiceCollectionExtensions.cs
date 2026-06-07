using CareerHub.Api.Data;
using CareerHub.Api.Repositories;
using CareerHub.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CareerHub.Api.Infrastructure;

// All application wiring lives here, grouped one method per feature area, so
// Program.cs never calls AddScoped / AddTransient / AddSingleton directly for a
// repository or service. (Part 5 / Part 7.)
public static class ServiceCollectionExtensions
{
    // EF Core + PostgreSQL. AddDbContext registers CareerHubDbContext as Scoped
    // (one instance per HTTP request) — the correct unit-of-work lifetime.
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<CareerHubDbContext>(options =>
            options.UseNpgsql(config.GetConnectionString("DefaultConnection")));
        return services;
    }

    // Job-listing feature: its repository, its service, and the company repository
    // it relies on to validate that a listing's company exists.
    public static IServiceCollection AddJobsFeature(this IServiceCollection services)
    {
        services.AddScoped<ICompanyRepository, CompanyRepository>();
        services.AddScoped<IJobListingRepository, JobListingRepository>();
        services.AddScoped<ISkillRepository, SkillRepository>();
        services.AddScoped<IJobListingService, JobListingService>();
        return services;
    }

    // Application feature: its repository and its service. (The service also
    // depends on IJobListingRepository, registered by AddJobsFeature.)
    public static IServiceCollection AddApplicationsFeature(this IServiceCollection services)
    {
        services.AddScoped<IApplicationRepository, ApplicationRepository>();
        services.AddScoped<IApplicationService, ApplicationService>();
        return services;
    }

    // Auth feature: registration / login / token issuing, and its applicant store.
    public static IServiceCollection AddAuthFeature(this IServiceCollection services)
    {
        services.AddScoped<IApplicantRepository, ApplicantRepository>();
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}
