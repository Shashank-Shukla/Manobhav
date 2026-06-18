namespace Domain.Entities;

public sealed class EmailOtpChallenge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string Flow { get; set; } = "";
    public string? OtpHash { get; set; }
    public string? OtpSalt { get; set; }
    public string? ProviderSession { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastSentAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public DateTimeOffset? VerifiedAtUtc { get; set; }
    public DateTimeOffset? VerificationLockedUntilUtc { get; set; }
    public string? VerificationLockToken { get; set; }
    public DateTimeOffset? InvalidatedAtUtc { get; set; }
    public string? InvalidationReason { get; set; }
    public string ExternalSendStatus { get; set; } = "pending";
    public string? ExternalSendFailure { get; set; }
    public int FailedAttempts { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
