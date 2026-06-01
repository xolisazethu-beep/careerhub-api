using Scalar.AspNetCore;
using Serilog;
using API.Middleware;
using API.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

//════════════════════════════════════════════════════
// Bootstrap Serilog before the host is built.
// This ensures even startup exceptions are logged.
//════════════════════════════════════════════════════
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

try
{
    Log.Information("Starting up the Conference Booking API...");

    var builder = WebApplication.CreateBuilder(args);

    // Replace the default .NET logger with Serilog
    builder.Host.UseSerilog();

    //════════════════════════════════════════════════════
    // BUILDER — Register services
    //════════════════════════════════════════════════════

    builder.Services.AddControllers();
    builder.Services.AddOpenApi();
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>(); // Day 3 — typed handler
    builder.Services.AddProblemDetails();

    // Part 1: CORS — named policy registered in builder phase
    // WithOrigins locks it to our Next.js dev server only
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("FrontEndPolicy", policy =>
        {
            policy.WithOrigins("http://localhost:3000") // front end dev port
                  .AllowAnyHeader()                     // Allows Authorization, Content-Type, etc
                  .AllowAnyMethod();                    // Allows GET, POST, DELETE etc..
        });
    });

    // Part 2: JWT Authentication
    // Read the secret from config — never hardcode secrets in source code
    // Key is stored in appsettings.Development.json under "Jwt:SecretKey"
    var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]!;

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer           = false, // Not validating who issues it bc its our own API
                ValidateAudience         = false, // Not checking who it is intended for
                ValidateLifetime         = true,  // This ensures you are able to reject expired tokens
                ValidateIssuerSigningKey = true,  // Verify the signature
                IssuerSigningKey         = new SymmetricSecurityKey(
                                               Encoding.UTF8.GetBytes(jwtSecretKey))
            };
        });

    builder.Services.AddAuthorization(); // Required for [Authorize(Roles = "...")]

    // Register BookingsStore as a singleton so the same in-memory list
    // is shared across all requests for the lifetime of the process
    builder.Services.AddSingleton<BookingsStore>();

    //════════════════════════════════════════════════════
    // TRANSITION — Build() seals the DI container.
    // Nothing can be registered after this line.
    //════════════════════════════════════════════════════
    var app = builder.Build();

    //════════════════════════════════════════════════════
    // PIPELINE — Configure the middleware chain. Order matters. Top to bottom.
    //
    //  1. Serilog          logs every request before anything can short-circuit it
    //  2. CORS             must be early to enable browser preflight OPTIONS requests
    //  3. ExceptionHandler catches all thrown exceptions from everything below
    //  4. Authentication   decodes the JWT → sets HttpContext.User
    //  5. Authorization    checks HttpContext.User against [Authorize] attributes
    //  6. MapControllers   routes to the actual endpoint method
    //
    //  Authentication MUST come before Authorization — you can't check what
    //  someone is allowed to do before you know who they are.
    //════════════════════════════════════════════════════

    app.UseSerilogRequestLogging(); // Logs every HTTP request + final response automatically
    app.UseCors("FrontEndPolicy");  // Must be early to enable interception of browser preflight OPTIONS requests
    app.UseExceptionHandler();      // Activates GlobalExceptionHandler — catches all thrown exceptions
    app.UseStatusCodePages();       // Fills empty 4xx/5xx responses with Problem Details body

    app.UseAuthentication();        // 4 — who are you?  Decodes JWT → populates HttpContext.User
    app.UseAuthorization();         // 5 — what are you allowed to do? Checks [Authorize] attributes

    if (app.Environment.IsDevelopment())
    {
    }

    app.MapOpenApi();              // Serves /openapi/v1.json
    app.MapScalarApiReference();   // Serves the Scalar UI at /scalar/v1
    app.MapControllers();          // Activates attribute routing for all [ApiController] classes

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application failed to start correctly.");
}
finally
{
    Log.CloseAndFlush(); // Ensure all buffered log entries are flushed before application exit.
}