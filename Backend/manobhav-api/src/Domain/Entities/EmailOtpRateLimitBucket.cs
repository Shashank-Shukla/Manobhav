namespace Domain.Entities;

public sealed class EmailOtpRateLimitBucket
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string Flow { get; set; } = "";
    public DateTimeOffset WindowStartedAtUtc { get; set; }
    public int WindowSendCount { get; set; }
    public DateTimeOffset LastReservedAtUtc { get; set; }
    public int Version { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
