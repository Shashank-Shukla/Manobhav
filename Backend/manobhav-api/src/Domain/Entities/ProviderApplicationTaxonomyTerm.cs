namespace Domain.Entities;

public sealed class ProviderApplicationTaxonomyTerm
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderApplicationId { get; set; }
    public Guid TermId { get; set; }
    public string? OtherText { get; set; }
    public string ReviewStatus { get; set; } = "PendingReview";
    public Guid? ReviewedByUserId { get; set; }
    public DateTimeOffset? ReviewedAtUtc { get; set; }
}
