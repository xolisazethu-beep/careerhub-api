namespace API.DTOs;

public class CreateBookingRequest
{
    public string Room { get; set; } = string.Empty;
    public string BookedBy { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}