using System.Text;
using CareerHub.Api.Data;
using CareerHub.Api.Infrastructure;
using CareerHub.Api.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ── BUILD-TIME DI VALIDATION (Part 5) ────────────────────────────────────────
// ValidateOnBuild  -> the container verifies the WHOLE graph at startup and the
//                     app refuses to start if any dependency cannot be resolved.
// ValidateScopes   -> a Singleton may not capture a Scoped/Transient dependency.
// Together these turn a lifetime mismatch into a loud startup crash instead of a
// silent runtime bug. (See the README "Lifetime misconfiguration" section.)
builder.Host.UseDefaultServiceProvider(options =>
{
    options.ValidateOnBuild = true;
    options.ValidateScopes = true;
});

// ── APPLICATION WIRING ───────────────────────────────────────────────────────
// One call per feature area. Repository/service lifetimes are registered inside
// these extension methods, never directly here. (Part 5 / Part 7.)
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddJobsFeature();
builder.Services.AddApplicationsFeature();
builder.Services.AddAuthFeature();

// ── JWT AUTHENTICATION ───────────────────────────────────────────────────────
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!))
        };
    });
builder.Services.AddAuthorization();

// Controllers handle all HTTP. Domain exceptions are absorbed by the handler.
builder.Services.AddControllers();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// OpenAPI document for the Scalar UI.
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                  // /openapi/v1.json
    app.MapScalarApiReference();       // Scalar UI at /scalar/v1
}

// Authentication MUST come before authorization.
app.UseAuthentication();
app.UseAuthorization();

// Apply any pending migrations and seed sample data on startup (dev convenience).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CareerHubDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        await SeedData.SeedAsync(db);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[startup] Could not migrate/seed: {ex.Message}");
        Console.WriteLine("[startup] Ensure PostgreSQL is running and the connection string is correct.");
    }
}

app.MapControllers();

app.Run();
