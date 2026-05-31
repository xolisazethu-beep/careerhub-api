using API.Data;
using API.DTOs;
using API.Exceptions;
using API.Models;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    // GET /api/Bookings
    [HttpGet]
    public ActionResult<IEnumerable<BookingResponse>> GetAll()
    {
        var bookings = BookingStore.Bookings.Select(b => new BookingResponse
        {
            Id = b.Id,
            Room = b.Room,
            BookedBy = b.BookedBy,
            StartTime = b.StartTime,
            EndTime = b.EndTime
        });

        return Ok(bookings);
    }

    // GET /api/Bookings/{id}
    [HttpGet("{id:guid}")]
    public ActionResult<BookingResponse> GetById(Guid id)
    {
        var booking = BookingStore.Bookings.FirstOrDefault(b => b.Id == id)
                      ?? throw new BookingNotFoundException(id);

        return Ok(new BookingResponse
        {
            Id = booking.Id,
            Room = booking.Room,
            BookedBy = booking.BookedBy,
            StartTime = booking.StartTime,
            EndTime = booking.EndTime
        });
    }

    // POST /api/Bookings
    [HttpPost]
    public ActionResult<BookingResponse> Create([FromBody] CreateBookingRequest request)
    {
        // Idempotency guard: prevent duplicate bookings
        // (same room + same start time = duplicate)
        bool isDuplicate = BookingStore.Bookings.Any(b =>
            b.Room == request.Room && b.StartTime == request.StartTime);

        if (isDuplicate)
        {
            throw new DuplicateBookingException(request.Room, request.StartTime);
        }

        var booking = new Booking
        {
            Room = request.Room,
            BookedBy = request.BookedBy,
            StartTime = request.StartTime,
            EndTime = request.EndTime
        };

        BookingStore.Bookings.Add(booking);

        var response = new BookingResponse
        {
            Id = booking.Id,
            Room = booking.Room,
            BookedBy = booking.BookedBy,
            StartTime = booking.StartTime,
            EndTime = booking.EndTime
        };

        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, response);
    }

    // DELETE /api/Bookings/{id}
    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        var booking = BookingStore.Bookings.FirstOrDefault(b => b.Id == id)
                      ?? throw new BookingNotFoundException(id);

        BookingStore.Bookings.Remove(booking);
        return NoContent();
    }
}