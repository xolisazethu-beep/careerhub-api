namespace API.DTOs;

// Capital U and capital P - records generate properties matching
// the exact casing of the constructor parameters.
// request.Username and request.Password will now resolve correctly.
public record LoginRequest(string Username, string Password);