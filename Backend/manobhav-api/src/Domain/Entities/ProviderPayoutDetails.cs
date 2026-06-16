namespace Domain.Entities;

public sealed class ProviderPayoutDetails
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderApplicationId { get; set; }
    public string? PayoutMode { get; set; }
    public string? AccountHolderName { get; set; }
    public string? BankName { get; set; }
    public string? AccountDetailsEncrypted { get; set; }
    public string? AccountLast4 { get; set; }
    public string? TaxIdentifierEncrypted { get; set; }
    public string Status { get; set; } = "Draft";
    public Guid? VerifiedByUserId { get; set; }
    public DateTimeOffset? VerifiedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}
