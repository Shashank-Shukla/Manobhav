namespace Domain.Entities;

public sealed class ProviderProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ProviderApplicationId { get; set; }
    public Guid? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string LongDescription { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? ProfessionalTitle { get; set; }
    public string? CredentialsSummary { get; set; }
    public int YearsExperience { get; set; }
    public string LanguagesJson { get; set; } = "[]";
    public string? Location { get; set; }
    public string? Bio { get; set; }
    public string? TherapyApproach { get; set; }
    public string SpecializationsJson { get; set; } = "[]";

    /// <summary>
    /// The provider's recurring weekly availability captured during onboarding, stored as a JSON
    /// array of <c>{ dayOfWeek, startTime, endTime }</c> entries (dayOfWeek 0=Sunday..6=Saturday,
    /// times as 24-hour "HH:mm"). This is the source of truth for the public directory's
    /// "next available dates" and the booking calendar's enabled weekdays; concrete bookable
    /// <see cref="ProviderAvailabilitySlot"/> rows are generated from it on demand.
    /// </summary>
    public string WeeklyAvailabilityJson { get; set; } = "[]";
    public string AvatarColor { get; set; } = "#9CAF88";
    public Guid? ProfilePhotoDocumentId { get; set; }
    public Guid? IntroVideoDocumentId { get; set; }
    public string VisibilityStatus { get; set; } = "Hidden";
    public int Sessions { get; set; }
    public decimal Rating { get; set; }
    public decimal RatingAverage { get; set; }
    public int ReviewCount { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public DateTimeOffset? PublishedAtUtc { get; set; }
    public DateTimeOffset? UnpublishedAtUtc { get; set; }
    public List<ProviderAvailability> Availabilities { get; set; } = [];
    public List<ProviderAvailabilitySlot> AvailabilitySlots { get; set; } = [];
}
