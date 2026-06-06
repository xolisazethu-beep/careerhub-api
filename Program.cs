using System.Text;
using CareerHub.Api.Data;
using CareerHub.Api.Endpoints;
using CareerHub.Api.Middleware;
using CareerHub.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// EF Core + PostgreSQL. AddDbContext registers the context as Scoped
// (one instance per HTTP request) — the correct unit-of-work lifetime.
builder.Services.AddDbContext<CareerHubDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Service layer.
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

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

// Register controllers for the new Application and Job controllers.
builder.Services.AddControllers();

// Clean error responses for domain exceptions.
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// OpenAPI document for the Scalar UI.
builder.Services.AddOpenApi(options =>
{
    // Register the JWT Bearer security scheme so Scalar shows an Authorize button.
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Components ??= new OpenApiComponents();
        // Microsoft.OpenApi 2.0 leaves SecuritySchemes null on a fresh
        // OpenApiComponents; initialize it before indexing or the document
        // transformer throws an NRE and the whole OpenAPI doc fails to generate.
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Paste the JWT token returned by /api/auth/login"
        };
        return Task.CompletedTask;
    });

    // Mark endpoints with RequireAuthorization() as requiring the Bearer scheme.
    options.AddOperationTransformer((operation, context, cancellationToken) =>
    {
        var requiresAuth = context.Description.ActionDescriptor.EndpointMetadata?
            .OfType<IAuthorizeData>()
            .Any() ?? false;

        if (requiresAuth)
        {
            operation.Security =
            [
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer")] = []
                }
            ];
        }
        return Task.CompletedTask;
    });
});

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
app.MapControllers();

app.Run();
