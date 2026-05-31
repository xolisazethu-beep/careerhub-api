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
// 1. Log the error
logger.LogError(exception,
"An exception occurred: {Message}", exception.Message);
// 2. Map domain exception to HTTP status code
var statusCode = exception switch
{
BookingNotFoundException => StatusCodes.Status404NotFound,
DuplicateBookingException => StatusCodes.Status409Conflict,
_ => StatusCodes.Status500InternalServerError
};
// 3. Build ProblemDetails (RFC 7807)
var problemDetails = new ProblemDetails
{
Status = statusCode,
Title = GetTitle(statusCode),
Detail = exception.Message,
Instance = httpContext.Request.Path
};
// 4. Write status code and JSON body
httpContext.Response.StatusCode = statusCode;
httpContext.Response.ContentType = "application/problem+json";
await httpContext.Response.WriteAsJsonAsync(
problemDetails, cancellationToken);
return true; // we handled it
}
private static string GetTitle(int statusCode) => statusCode switch
{
StatusCodes.Status404NotFound => "Resource Not Found",
StatusCodes.Status409Conflict => "Resource Conflict",
_ => "Internal Server Error"
};
}
