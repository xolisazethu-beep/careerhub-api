using API.DTOs;

namespace API.Data;

// In-memory store - simulates a database for Week 1
// Week 2 will replace this with an EF Core DbContext + real SQL table
public class BookingsStore
{
    // Static list so data persists for the lifetime of the running process
    private static readonly List<BookingResponse> _bookings = new();
    private static int _nextId = 1;

    public List<BookingResponse> GetAll() => _bookings;

    public BookingResponse? GetById(int id) =>
        _bookings.FirstOrDefault(b => b.Id == id);

    public BookingResponse Create(CreateBookingRequest request)
    {
        var booking = new BookingResponse(
            Id:             _nextId++,
            ConferenceName: request.ConferenceName,
            AttendeeEmail:  request.AttendeeEmail,
            BookingDate:    DateTime.UtcNow,
            SeatsReserved:  request.SeatsReserved
        );

        _bookings.Add(booking);
        return booking;
    }

    public bool Delete(int id)
    {
        var booking = GetById(id);
        if (booking is null) return false;

        _bookings.Remove(booking);
        return true;
    }
}