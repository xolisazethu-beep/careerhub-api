namespace CareerHub.Api.Exceptions;

// Thrown when a requested resource does not exist -> mapped to HTTP 404.
public class NotFoundException(string message) : Exception(message);

// Thrown when an applicant tries to apply twice to the same listing -> HTTP 409.
public class DuplicateApplicationException(string message) : Exception(message);

// Thrown for other conflicts (e.g. registering an email that already exists) -> HTTP 409.
public class ConflictException(string message) : Exception(message);

// Thrown for invalid credentials -> HTTP 401.
public class UnauthorizedException(string message) : Exception(message);
