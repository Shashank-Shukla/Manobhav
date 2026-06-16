namespace Domain.Entities;

public sealed class Consent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public Guid? VisitorSessionId { get; set; }
    public Guid? IntakeSubmissionId { get; set; }
    public Guid? BookingHoldId { get; set; }
    public Guid? AppointmentId { get; set; }
    public string ConsentType { get; set; } = string.Empty;
    public int PolicyVersion { get; set; }
    public bool Accepted { get; set; }
    public string? TypedName { get; set; }
    public DateTimeOffset SignedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
