namespace API.Exceptions;

public class DuplicateBookingException : Exception
{
    public DuplicateBookingException(string room, DateTime startTime)
        : base($"A booking for room '{room}' at {startTime:o} already exists.")
    {
    }
}