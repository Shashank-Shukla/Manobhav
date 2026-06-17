namespace Domain.Entities;

public sealed class AdminNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string NotificationKey { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string LinkPath { get; set; } = string.Empty;
    public string? SourceEntityType { get; set; }
    public string? SourceEntityId { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ReadAtUtc { get; set; }
}
