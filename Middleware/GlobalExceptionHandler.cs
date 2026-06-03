using CareerHub.Api.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CareerHub.Api.Middleware;

// Implements .NET's IExceptionHandler. Registered in Program.cs via
// AddExceptionHandler<GlobalExceptionHandler>() + UseExceptionHandler().
public class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title) = exception switch
        {
            NotFoundException             => (StatusCodes.Status404NotFound, "Resource not found"),
            DuplicateApplicationException => (StatusCodes.Status409Conflict, "Duplicate application"),
            ConflictException             => (StatusCodes.Status409Conflict, "Conflict"),
            UnauthorizedException         => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            _                             => (StatusCodes.Status500InternalServerError, "An error occurred")
        };

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = exception.Message
        };

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true; // handled
    }
}
