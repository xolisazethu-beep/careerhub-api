using Scalar.AspNetCore;
using Serilog;
using API.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text; 
// 
//════════════════════════════════════════════════════ 
// Bootstrap Serilog before the host is built. 
// This ensures even startup exceptions are logged. 
// 
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
    // 
    //════════════════════════════════════════════════════ 
    // BUILDER — Register services 
    // 
    //════════════════════════════════════════════════════ 
    builder.Services.AddControllers();
    builder.Services.AddOpenApi();
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>(); // Day 3 — typed handler
    builder.Services.AddProblemDetails();
    builder.Services.AddCors(options =>
    {
     options.AddPolicy("FrontEndPolicy", policy =>
     {
        policy.WithOrigins("http://localhost:300") // front end dev port
        .AllowAnyHeader() //Allows authorization, Content-Type, etc
        .AllowAnyMethod(); //Allows GET,POST,DELETE etc.. 
     }); 
    }); 
    var jwtSecretKey = "super-secret-key-that-must-be-very-long-for-hs256-to-work-securely!"; 
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false, // Not validating who issues it bc its our own API
            ValidateAudience = false, // Not checking who it is intended for
            ValidateLifetime = true, // This ensures you are able to reject expired tokens
            ValidateIssuerSigningKey = true,// verify the signature
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSecretKey)
            )
        };
    });
    builder.Services.AddAuthorization(); //Required for [Authorize(Roles= ...)]
    // 
    // TRANSITION — Build() seals the DI container. 
    // Nothing can be registered after this line. 
    // 
    //════════════════════════════════════════════════════ 
    var app = builder.Build();
    // 
    //════════════════════════════════════════════════════ 
    // PIPELINE — Configure the middleware chain.  Order matters. Top to bottom. 
    // 
    //════════════════════════════════════════════════════ 
    app.UseSerilogRequestLogging(); // Logs every HTTP request + final response automatically 
    app.UseCors("FrontEndPolicy");// Must be early to enable interception of browser preflight options requests
    app.UseAuthentication();
    app.UseAuthorization(); 
    app.UseExceptionHandler();  // Activates GlobalExceptionHandler — catches all thrown exceptions 
    app.UseStatusCodePages();   // Fills empty 4xx/5xx responses with Problem Details body 
    if (app.Environment.IsDevelopment())
    {
    }
    app.MapOpenApi();
    // Serves /openapi/v1.json 
    app.MapScalarApiReference();  // Serves the Scalar UI at /scalar/v1 
    app.MapControllers();  // Activates attribute routing for all [ApiController] classes 
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application failed to start correctly.");
}

finally
{
    Log.CloseAndFlush(); //Ensure all buffered log entries are flushed before application exit. 
}