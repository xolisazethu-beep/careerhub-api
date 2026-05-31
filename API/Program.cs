using API.Middleware;
using Scalar.AspNetCore;
using Serilog;

// 1. Configure Serilog at the VERY TOP so startup errors are captured
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

try
{
    Log.Information("Starting up the Conference Booking API...");

    var builder = WebApplication.CreateBuilder(args);

    // 2. Tell ASP.NET to use Serilog as the logging provider
    builder.Host.UseSerilog();

    // Add services to the container
    builder.Services.AddControllers();
    builder.Services.AddOpenApi();

    // Register the global exception handler
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
    builder.Services.AddProblemDetails();

    var app = builder.Build();

    // 3. Plug the exception handler into the pipeline (must come early)
    app.UseExceptionHandler();

    // 4. Add Serilog request logging - logs every HTTP request automatically
    app.UseSerilogRequestLogging();

    // Configure the HTTP request pipeline
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference();
    }

    app.UseHttpsRedirection();
    app.MapControllers();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application failed to start");
}
finally
{
    Log.CloseAndFlush();
}