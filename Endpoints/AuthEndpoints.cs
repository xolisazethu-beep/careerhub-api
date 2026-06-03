using CareerHub.Api.DTOs;
using CareerHub.Api.Services;

namespace CareerHub.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        // POST /api/auth/register -> create an applicant account, return a token
        group.MapPost("/register", async (RegisterRequest request, IAuthService auth) =>
            Results.Ok(await auth.RegisterAsync(request)));

        // POST /api/auth/login -> verify credentials, return a token
        group.MapPost("/login", async (LoginRequest request, IAuthService auth) =>
            Results.Ok(await auth.LoginAsync(request)));
    }
}
