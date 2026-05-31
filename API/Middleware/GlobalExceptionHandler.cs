using API.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace API.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // 1. Log the error first - always
        logger.LogError(
            exception,
            "An exception occurred: {Message}",
            exception.Message);

        // 2. Translate the exception to an HTTP status code
        var statusCode = exception switch
        {
            BookingNotFoundException   => StatusCodes.Status404NotFound,
            DuplicateBookingException  => StatusCodes.Status409Conflict,
            _                          => StatusCodes.Status500InternalServerError
        };

        // 3. Build a ProblemDetails response (RFC 7807 standard)
        var problemDetails = new ProblemDetails
        {
            Status   = statusCode,
            Title    = GetTitle(statusCode),
            Detail   = exception.Message,
            Instance = httpContext.Request.Path
        };

        // 4. Write the response
        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        // Return true to tell .NET: "I handled this exception, don't crash"
        return true;
    }

    private static string GetTitle(int statusCode) => statusCode switch
    {
        StatusCodes.Status404NotFound          => "Resource Not Found",
        StatusCodes.Status409Conflict          => "Resource Conflict",
        _                                      => "Internal Server Error"
    };
}