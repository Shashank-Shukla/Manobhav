namespace Domain.Entities;

public sealed class ProviderAvailabilitySlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderProfileId { get; set; }
    public DateTimeOffset StartsAtUtc { get; set; }
    public DateTimeOffset EndsAtUtc { get; set; }
    public string Status { get; set; } = "Available";
    public Guid? CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public ProviderProfile ProviderProfile { get; set; } = null!;
}
