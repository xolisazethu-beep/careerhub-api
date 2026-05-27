using System.Text.Json.Serialization;
using CareerHub.Api.Endpoints;
using CareerHub.Api.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Registers RFC 7807 Problem Details as the standard error shape for the whole API.
// Without this, framework errors (400s from model binding, 404s for unmapped routes, 500s
// from unhandled exceptions) would come back as plain text or default HTML pages.
builder.Services.AddProblemDetails();

// Serialize enum values as strings ("FullTime") instead of numbers (0) in JSON responses.
// A client reading "type": "FullTime" understands it immediately; "type": 0 forces them
// to look up the source code.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// OpenAPI document — Scalar reads this to render the interactive UI.
builder.Services.AddOpenApi();

// In-memory job storage. Singleton so the data survives across requests.
builder.Services.AddSingleton<IJobService, InMemoryJobService>();

var app = builder.Build();

// Catches any unhandled exception thrown by an endpoint and turns it into a
// Problem Details response, so we never leak stack traces or HTML error pages.
app.UseExceptionHandler();

// Turns bare status-code responses (e.g. a raw 404 from MapGet with no matching route)
// into Problem Details too, so every failure has the same JSON shape.
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    // Serves the raw OpenAPI JSON at /openapi/v1.json
    app.MapOpenApi();

    // Serves the Scalar interactive UI at /scalar/v1
    app.MapScalarApiReference();
}

// Map the /jobs endpoints (defined in Endpoints/JobEndpoints.cs).
app.MapJobEndpoints();

app.Run();
