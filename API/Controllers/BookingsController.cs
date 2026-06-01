using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using API.Models;
using API.Data;
using API.DTOs;
using API.Exceptions;
namespace API.Controllers;
using API.Middleware;


[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly BookingsStore _store;

    // BookingsStore is registered as a singleton in Program.cs
    // so the same in-memory list is shared across all requests
    public BookingsController(BookingsStore store)
    {
        _store = store;
    }

    // Anonymous - anyone can view all bookings, no token needed
    [AllowAnonymous]
    [HttpGet]
    public IActionResult GetAll()
    {
        var bookings = _store.GetAll();
        return Ok(bookings);
    }

    // Anonymous - anyone can view a single booking
    [AllowAnonymous]
    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var booking = _store.GetById(id);
        if (booking is null) return NotFound();
        return Ok(booking);
    }

    // Employer only - must have a valid JWT with role = "Employer"
    // No token       → 401 Unauthorized  (UseAuthentication fires before controller)
    // Wrong role     → 403 Forbidden     (UseAuthorization fires before controller)
    // Correct role   → 201 Created
    [Authorize(Roles = "Employer")]
    [HttpPost]
    public IActionResult Create([FromBody] CreateBookingRequest request)
    {
        var booking = _store.Create(request);
        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, booking);
    }

    // Employer only - to test 403: temporarily change role to "User" in AuthController,
    // get a fresh token, call this endpoint - you will get 403 not 401
    [Authorize(Roles = "Employer")]
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var deleted = _store.Delete(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}