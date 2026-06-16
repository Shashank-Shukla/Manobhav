namespace Domain.Entities;

public sealed class ProviderOnboardingApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Status { get; set; } = "Draft";
    public string? CurrentStep { get; set; }
    public string BasicProfileJson { get; set; } = "{}";
    public string BioJson { get; set; } = "{}";
    public string SessionDetailsJson { get; set; } = "{}";
    public DateTimeOffset? SubmittedAtUtc { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public DateTimeOffset? ReviewedAtUtc { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTimeOffset? ApprovedAtUtc { get; set; }
    public DateTimeOffset? RejectedAtUtc { get; set; }
    public DateTimeOffset? SuspendedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public User User { get; set; } = null!;
}
