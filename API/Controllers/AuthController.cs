using Microsoft.AspNetCore.Mvc;
using API.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.DTOs;
using API.Exceptions;
using Microsoft.AspNetCore.Authorization;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // Step 1: Verify the identity
        // Week2: await  _databse.Users.FirstOrDefault( U => u.
        //u.Username == request.Username && u.Password == request.Password)

        if (request.username != "Admin" || request.Password != "Password123!")
        {
            return Unauthorized(); //401
        }
        //Step 2: Build the claims Payload
        //
        var claims = new[]
        {
            new Claim (JwtRegisteredClaimNames.Sub, request.username), //Subject: who is tthis token for
            new Claim (ClaimTypes.Role, "Admin") //Role: What are they allowed to do 

        };
        //Step 3: Create the signing credentials 
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("super-secret-key-that-must-be-very-long-for-hs256-to-work-securely!")
        );
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        //Step 4 Construct and sign the token

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
        // User is a claims Principal - Populated UseAuthentications after jwt Validation
        var username = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var role = User.FindFirstValue(ClaimTypes.Role);

        return Ok(new { username, role });
    }
}