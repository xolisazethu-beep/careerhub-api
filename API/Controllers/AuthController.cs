using Microsoft.AspNetCore.Mvc;
using API.Models;
using API.Data;
using API.DTOs;
using API.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;


    public AuthController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // Step 1: Verify the identity
        // Week 2: await _database.Users.FirstOrDefault(u =>
        //     u.Username == request.Username && u.Password == request.Password)
        if (request.Username != "employer" || request.Password != "password123")
        {
            return Unauthorized(); // 401 - don't reveal which field was wrong
        }

        // Step 2: Build the claims payload
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, request.Username), // Subject: who is this token for
            new Claim(ClaimTypes.Role, "Employer")                    // Role: what are they allowed to do
        };

        // Step 3: Create the signing credentials
        // Key comes from config - never hardcode secrets in source code
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]!)
        );
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Step 4: Construct and sign the token
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return Ok(new LoginResponse(tokenString));
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        var username = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var role = User.FindFirstValue(ClaimTypes.Role);

        return Ok(new { username, role });
    }
}