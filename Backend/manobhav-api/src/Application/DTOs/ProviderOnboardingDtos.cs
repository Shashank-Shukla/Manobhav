using System.Text.Json;
using System.Text.Json.Serialization;

namespace Application.DTOs;

public sealed record ProviderApplicationDto
{
    private static readonly IReadOnlyDictionary<string, JsonElement> EmptySections =
        new Dictionary<string, JsonElement>(StringComparer.Ordinal);
    private static readonly IReadOnlyDictionary<string, ProviderApplicationSectionReviewDto> EmptySectionReviews =
        new Dictionary<string, ProviderApplicationSectionReviewDto>(StringComparer.Ordinal);

    public ProviderApplicationDto(
        Guid id,
        Guid userId,
        string status,
        string? currentStep,
        DateTimeOffset createdAtUtc,
        DateTimeOffset? updatedAtUtc,
        DateTimeOffset? submittedAtUtc,
        IReadOnlyDictionary<string, JsonElement>? sections = null,
        IReadOnlyDictionary<string, ProviderApplicationSectionReviewDto>? sectionReviews = null,
        string? email = null)
    {
        Id = id;
        UserId = userId;
        Status = status;
        CurrentStep = currentStep;
        CreatedAtUtc = createdAtUtc;
        UpdatedAtUtc = updatedAtUtc;
        SubmittedAtUtc = submittedAtUtc;
        Sections = sections ?? EmptySections;
        SectionReviews = sectionReviews ?? EmptySectionReviews;
        Email = email;
    }

    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string Status { get; init; }
    public string? CurrentStep { get; init; }
    public DateTimeOffset CreatedAtUtc { get; init; }
    public DateTimeOffset? UpdatedAtUtc { get; init; }
    public DateTimeOffset? SubmittedAtUtc { get; init; }
    public IReadOnlyDictionary<string, JsonElement> Sections { get; init; }
    public IReadOnlyDictionary<string, ProviderApplicationSectionReviewDto> SectionReviews { get; init; }
    public string? Email { get; init; }
}

public sealed record ProviderApplicationSectionReviewDto(
    Guid Id,
    string SectionKey,
    string Status,
    string? Comment,
    DateTimeOffset ReviewedAtUtc);

public sealed class ProviderApplicationSectionReviewRequest
{
    public const int MaxCommentLength = 2000;

    public string? Status { get; init; }
    public string? Comment { get; init; }
}

public sealed record ProviderTaxonomyOptionDto(string Key, string Label);

public sealed record ProviderOnboardingTaxonomyDto(
    IReadOnlyList<ProviderTaxonomyOptionDto> Specializations,
    IReadOnlyList<ProviderTaxonomyOptionDto> TherapyApproaches,
    IReadOnlyList<ProviderTaxonomyOptionDto> Languages);

public sealed class SaveProviderSectionRequest
{
    public string? CurrentStep { get; init; }
    public ProviderBasicIdentitySection? BasicIdentity { get; init; }
    public ProviderBioSection? Bio { get; init; }
    public ProviderSpecializationsSection? Specializations { get; init; }
    public ProviderModalitiesSection? Modalities { get; init; }
    public ProviderSessionDetailsSection? SessionDetails { get; init; }
    public ProviderCredentialsSection? Credentials { get; init; }
    public ProviderPayoutSection? Payout { get; init; }

    [JsonExtensionData]
    public IDictionary<string, JsonElement>? ExtensionData { get; init; }
}

public sealed class ProviderBasicIdentitySection
{
    public string? LegalName { get; init; }
    public string? DisplayName { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? Location { get; init; }
}

public sealed class ProviderBioSection
{
    public string? ShortBio { get; init; }
    public string? LongBio { get; init; }
    public IReadOnlyList<string>? Languages { get; init; }
}

public sealed class ProviderSpecializationsSection
{
    public IReadOnlyList<string>? FocusAreas { get; init; }
    public IReadOnlyList<string>? AgeGroups { get; init; }
}

public sealed class ProviderModalitiesSection
{
    public IReadOnlyList<string>? Modalities { get; init; }
}

public sealed class ProviderSessionDetailsSection
{
    public IReadOnlyList<AvailabilitySlotDto>? AvailabilitySlots { get; init; }
    public int? CapacityPerWeek { get; init; }
}

/// <summary>
/// A single weekly availability slot for a provider.
/// <paramref name="DayOfWeek"/> is 0=Sunday through 6=Saturday.
/// <paramref name="StartTime"/> and <paramref name="EndTime"/> are 24-hour
/// "HH:mm" strings (e.g. "09:00", "17:30"); the start must be strictly before the end.
/// </summary>
public sealed record AvailabilitySlotDto(int DayOfWeek, string StartTime, string EndTime);

public sealed class ProviderCredentialsSection
{
    public IReadOnlyList<ProviderCredentialMetadata>? Items { get; init; }
}

public sealed class ProviderCredentialMetadata
{
    public string? CredentialType { get; init; }
    public string? Title { get; init; }
    public string? Institution { get; init; }
    public string? LicenseNumber { get; init; }
    public int? Year { get; init; }
}

/// <summary>
/// Indian bank payout details for a provider.
/// <see cref="AccountNumber"/> is sensitive PII and must be handled accordingly
/// (never logged or surfaced in notifications). <see cref="IfscCode"/> is the
/// 11-character RBI IFSC code identifying the bank branch.
/// </summary>
public sealed class ProviderPayoutSection
{
    public string? AccountNumber { get; init; }
    public string? BankName { get; init; }
    public string? IfscCode { get; init; }
}

public sealed record ProviderDocumentUploadRequest(
    string Category,
    string OriginalFileName,
    string ContentType,
    long SizeBytes);

public sealed record ProviderDocumentDto(
    Guid Id,
    Guid ProviderApplicationId,
    string Category,
    string Status,
    string S3Key);
