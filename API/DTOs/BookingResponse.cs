namespace API.DTOs;

public class BookingResponse
{
    public Guid Id { get; set; }
    public string Room { get; set; } = string.Empty;
    public string BookedBy { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}