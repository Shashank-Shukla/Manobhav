namespace Domain.Entities;

public sealed class ProviderCredential
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderApplicationId { get; set; }
    public string CredentialType { get; set; } = string.Empty;
    public string? Degree { get; set; }
    public string? University { get; set; }
    public string? LicenseBody { get; set; }
    public string? LicenseNumber { get; set; }
    public string? CertificationName { get; set; }
    public Guid? DocumentId { get; set; }
    public string VerificationStatus { get; set; } = "PendingReview";
    public Guid? VerifiedByUserId { get; set; }
    public DateTimeOffset? VerifiedAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
}
