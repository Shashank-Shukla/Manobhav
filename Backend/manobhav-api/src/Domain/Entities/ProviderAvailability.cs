namespace Domain.Entities;

public sealed class ProviderAvailability
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderProfileId { get; set; }
    public DateTimeOffset StartsAtUtc { get; set; }
    public bool IsAvailable { get; set; } = true;
    public ProviderProfile ProviderProfile { get; set; } = null!;
}
