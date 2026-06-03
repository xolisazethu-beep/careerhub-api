using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CareerHub.Api.Data;
using CareerHub.Api.DTOs;
using CareerHub.Api.Exceptions;
using CareerHub.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CareerHub.Api.Services;

public class AuthService(CareerHubDbContext db, IConfiguration config) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var emailTaken = await db.Applicants.AnyAsync(a => a.Email == request.Email);
        if (emailTaken)
            throw new ConflictException("An account with this email already exists.");

        var applicant = new Applicant
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = PasswordHasher.Hash(request.Password)
        };

        db.Applicants.Add(applicant);
        await db.SaveChangesAsync();

        return new AuthResponse(GenerateToken(applicant), applicant.Id, applicant.Email);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var applicant = await db.Applicants.FirstOrDefaultAsync(a => a.Email == request.Email);

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
