namespace Domain.Entities;

public sealed class BookingHold
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderProfileId { get; set; }
    public Guid SlotId { get; set; }
    public Guid? VisitorSessionId { get; set; }
    public Guid? UserId { get; set; }
    public Guid? IntakeSubmissionId { get; set; }
    public string Status { get; set; } = "Active";
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public string ProviderSnapshotJson { get; set; } = "{}";
    public string SelectedSlotSnapshotJson { get; set; } = "{}";
    public string FlowStateJson { get; set; } = "{}";
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public DateTimeOffset? CancelledAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
}
