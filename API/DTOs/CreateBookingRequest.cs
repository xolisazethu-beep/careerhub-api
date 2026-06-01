namespace API.DTOs;

// Shape of the body sent to POST /api/bookings
// Validation attributes keep bad data from ever reaching the store
using System.ComponentModel.DataAnnotations;

public record CreateBookingRequest(
    [Required] string ConferenceName,
    [Required][EmailAddress] string AttendeeEmail,
    [Range(1, 20)] int SeatsReserved
);