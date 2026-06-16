namespace Domain.Entities;

public sealed class ProviderReview
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderProfileId { get; set; }
    public Guid AppointmentId { get; set; }
    public Guid PatientUserId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public string PublicReviewerLabel { get; set; } = "Anonymous";
    public string Status { get; set; } = "Published";
    public bool IsRatingIncludedInAggregate { get; set; } = true;
    public DateTimeOffset SubmittedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? HiddenAtUtc { get; set; }
    public Guid? HiddenByUserId { get; set; }
    public string? HideReason { get; set; }
    public DateTimeOffset? RemovedAtUtc { get; set; }
}
