namespace CareerHub.Api.Exceptions;

// Every rule the service layer enforces throws one of these. They carry only a
// message — the GlobalExceptionHandler is the single place that decides which
// HTTP status code each one becomes, so controllers never touch status codes
// and never wrap calls in try/catch.

// A requested resource does not exist -> HTTP 404.
public class NotFoundException(string message) : Exception(message);

// A request is well-formed but violates a value rule
// (e.g. a listing's closing date is not in the future) -> HTTP 400.
public class ValidationException(string message) : Exception(message);

// The caller is authenticated but not allowed to act on this resource
// (e.g. updating a listing they do not own, withdrawing another applicant's
// application) -> HTTP 403.
public class ForbiddenException(string message) : Exception(message);

// Invalid credentials -> HTTP 401.
public class UnauthorizedException(string message) : Exception(message);

// A generic state conflict (e.g. registering an email that already exists) -> HTTP 409.
public class ConflictException(string message) : Exception(message);

// An applicant tries to apply twice to the same listing -> HTTP 409.
public class DuplicateApplicationException(string message) : Exception(message);

// An operation is attempted against a listing that is closed / past its closing
// date (creating an application, or editing the listing) -> HTTP 409.
public class ListingClosedException(string message) : Exception(message);

// An application is asked to move between two states the workflow does not allow
// (e.g. Submitted -> Offered, or any move out of Rejected) -> HTTP 422.
public class InvalidStatusTransitionException(string message) : Exception(message);
