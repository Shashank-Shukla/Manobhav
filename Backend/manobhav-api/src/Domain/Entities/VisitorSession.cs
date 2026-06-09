namespace Domain.Entities;

public class VisitorSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public string? LandingPath { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Referrer { get; set; }
    public string? TimeZone { get; set; }
    public string? DeviceInfo { get; set; }
    public string? NetworkInfo { get; set; }
    public string? UtmSource { get; set; }
    public string? UtmMedium { get; set; }
    public string? UtmCampaign { get; set; }
    public string? LinkedUserSubject { get; set; }
    public DateTimeOffset? LinkedAtUtc { get; set; }
    public List<VisitorEvent> Events { get; set; } = [];
}
