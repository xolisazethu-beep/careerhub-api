using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CareerHub.Api.DTOs;
using CareerHub.Api.Exceptions;
using CareerHub.Api.Models;
using CareerHub.Api.Repositories;
using Microsoft.IdentityModel.Tokens;

// No "using Microsoft.EntityFrameworkCore;" — all data access goes through
// IApplicantRepository, so repositories stay the only EF Core importers.

namespace CareerHub.Api.Services;

public class AuthService(IApplicantRepository applicants, IConfiguration config) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await applicants.EmailExistsAsync(request.Email))
            throw new ConflictException("An account with this email already exists.");

        var applicant = new Applicant
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = PasswordHasher.Hash(request.Password)
        };

        await applicants.AddApplicantAsync(applicant);

        return new AuthResponse(GenerateToken(applicant), applicant.Id, applicant.Email);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var applicant = await applicants.GetByEmailAsync(request.Email);

        if (applicant is null || !PasswordHasher.Verify(request.Password, applicant.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        return new AuthResponse(GenerateToken(applicant), applicant.Id, applicant.Email);
    }

    private string GenerateToken(Applicant applicant)
    {
        var jwt = config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // The applicant's Id travels in the token. The apply endpoint reads it
        // back from here, so the caller cannot pretend to be someone else.
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, applicant.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, applicant.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, applicant.Email)
        };

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
