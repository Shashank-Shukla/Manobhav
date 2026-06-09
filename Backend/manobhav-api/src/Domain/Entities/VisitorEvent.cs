namespace Domain.Entities;

public class VisitorEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VisitorSessionId { get; set; }
    public VisitorSession? VisitorSession { get; set; }
    public string EventType { get; set; } = "";
    public string Route { get; set; } = "";
    public string? TargetKey { get; set; }
    public string PropertiesJson { get; set; } = "{}";
    public DateTimeOffset? ClientTimestampUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
