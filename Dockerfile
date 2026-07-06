# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────────────────────────────────
# The full SDK is only needed to restore + publish; it never ships in the final
# image. Targets net10.0 to match CareerHub.Api.csproj.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore as its own layer, keyed only on the project file, so `dotnet restore`
# is cached and re-runs only when the dependency list actually changes.
COPY CareerHub.Api.csproj ./
RUN dotnet restore CareerHub.Api.csproj

# Bring in the rest of the source and publish a trimmed Release build. The test
# project (CareerHub.Api.Tests/**) is already excluded by the .csproj globs, so
# publishing the API project never pulls it in. UseAppHost=false skips the native
# launcher we don't need — the app is started via `dotnet CareerHub.Api.dll`.
COPY . ./
RUN dotnet publish CareerHub.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# ── Runtime stage ────────────────────────────────────────────────────────────
# Only the ASP.NET Core runtime, not the SDK, for a smaller attack surface.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Kestrel binds to 8080 inside the container (the aspnet image default port).
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# Run as the non-root user the base image already provides.
USER $APP_UID

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "CareerHub.Api.dll"]
