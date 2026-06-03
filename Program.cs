using System.Text;
using CareerHub.Api.Data;
using CareerHub.Api.Endpoints;
using CareerHub.Api.Middleware;
using CareerHub.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// EF Core + PostgreSQL. AddDbContext registers the context as Scoped
// (one instance per HTTP request) — the correct unit-of-work lifetime.
builder.Services.AddDbContext<CareerHubDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Service layer.
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// ── JWT AUTHENTICATION ──────────────────────────────────────────────────────
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

// Clean error responses for domain exceptions.
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
// NOTE: generate the migration first (see the PDF, Part 4) — otherwise there is
// no schema to apply and this will report that no migrations exist.
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
        Console.WriteLine("[startup] Run 'dotnet ef migrations add <Name>' then restart.");
    }
}

app.MapAuthEndpoints();
app.MapJobEndpoints();

app.Run();
