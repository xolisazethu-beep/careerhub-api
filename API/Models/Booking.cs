namespace API.Models;

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Room { get; set; } = string.Empty;
    public string BookedBy { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}