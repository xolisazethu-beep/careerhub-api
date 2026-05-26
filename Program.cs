using CareerHub.Api.Endpoints;
using CareerHub.Api.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Native .NET 10 OpenAPI tooling — generates /openapi/v1.json from
// endpoint metadata and the typed Results<...> return signatures.
builder.Services.AddOpenApi();

// In-memory data lives for the lifetime of the app, so Singleton is appropriate.
// Swap this single line for an EF Core / PostgreSQL implementation in a later assignment;
// no endpoint code changes.
builder.Services.AddSingleton<IJobService, InMemoryJobService>();

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
