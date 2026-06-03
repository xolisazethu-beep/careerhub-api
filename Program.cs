using CareerHub.Api.Data;
using CareerHub.Api.Endpoints;
using CareerHub.Api.Services;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<CareerHubDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IJobService, DbJobService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // Serves the generated OpenAPI document at /openapi/v1.json
    app.MapOpenApi();

    // Scalar UI — interactive API reference at /scalar/v1
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("CareerHub API");
        options.WithTheme(ScalarTheme.BluePlanet);
    });
}

app.UseHttpsRedirection();

// All /jobs routes (kept out of Program.cs for cleanliness)
app.MapJobEndpoints();

app.Run();
