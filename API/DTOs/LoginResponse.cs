namespace API.DTOs;

// Shape of the response - just the signed JWT string
// Client stores this and sends it as: Authorization: Bearer <token>
public record LoginResponse(string Token);