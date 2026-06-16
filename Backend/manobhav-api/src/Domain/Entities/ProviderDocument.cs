namespace Domain.Entities;

public sealed class ProviderDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderApplicationId { get; set; }
    public Guid UploadedByUserId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = "Uploaded";
    public string OriginalFileName { get; set; } = string.Empty;
    public string SafeFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string S3Bucket { get; set; } = string.Empty;
    public string S3Key { get; set; } = string.Empty;
    public DateTimeOffset UploadedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public Guid? ReviewedByUserId { get; set; }
    public DateTimeOffset? ReviewedAtUtc { get; set; }
    public string? ReviewNotes { get; set; }
    public Guid? ReplacedByDocumentId { get; set; }
    public DateTimeOffset? DeletedAtUtc { get; set; }
}
