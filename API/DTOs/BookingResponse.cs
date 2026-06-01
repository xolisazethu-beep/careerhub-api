namespace API.DTOs;

// Shape of the data we return to the caller for a booking
// We never expose the raw model directly - always map to a DTO
public record BookingResponse(
    int Id,
    string ConferenceName,
    string AttendeeEmail,
    DateTime BookingDate,
    int SeatsReserved
);