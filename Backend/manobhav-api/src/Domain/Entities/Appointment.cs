namespace Domain.Entities;

public sealed class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookingHoldId { get; set; }
    public Guid PatientUserId { get; set; }
    public Guid ProviderProfileId { get; set; }
    public Guid SlotId { get; set; }
    public Guid IntakeSubmissionId { get; set; }
    public DateTimeOffset StartsAtUtc { get; set; }
    public DateTimeOffset EndsAtUtc { get; set; }
    public string Status { get; set; } = "Scheduled";
    public string PaymentStatus { get; set; } = "NotRequired";
    public string? PaymentProvider { get; set; }
    public string? PaymentReference { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public DateTimeOffset? CancelledAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
}
