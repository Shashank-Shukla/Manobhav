namespace Domain.Entities;

public sealed class ProviderApplicationSectionReview
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderApplicationId { get; set; }
    public string SectionKey { get; set; } = string.Empty;
    public string Status { get; set; } = "PendingReview";
    public string? Comment { get; set; }
    public DateTimeOffset ReviewedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public ProviderOnboardingApplication Application { get; set; } = null!;
}
