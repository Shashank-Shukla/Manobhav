namespace Domain.Entities;

public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset OccurredAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public Guid? ActorUserId { get; set; }
    public string? ActorSubject { get; set; }
    public string ActorType { get; set; } = "System";
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? CorrelationId { get; set; }
    public string? RequestPath { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string BeforeJson { get; set; } = "{}";
    public string AfterJson { get; set; } = "{}";
    public string ChangedFieldsJson { get; set; } = "[]";
    public bool RedactionApplied { get; set; } = true;
    public string? Reason { get; set; }
    public string? WorkflowEventType { get; set; }
}
