using System.Text.Json;
using System.Text.Json.Serialization;

namespace Application.DTOs;

public sealed record ProviderApplicationDto
{
    private static readonly IReadOnlyDictionary<string, JsonElement> EmptySections =
        new Dictionary<string, JsonElement>(StringComparer.Ordinal);

    public ProviderApplicationDto(
        Guid id,
        Guid userId,
        string status,
        string? currentStep,
        DateTimeOffset createdAtUtc,
        DateTimeOffset? updatedAtUtc,
        DateTimeOffset? submittedAtUtc,
        IReadOnlyDictionary<string, JsonElement>? sections = null)
    {
        Id = id;
        UserId = userId;
        Status = status;
        CurrentStep = currentStep;
        CreatedAtUtc = createdAtUtc;
        UpdatedAtUtc = updatedAtUtc;
        SubmittedAtUtc = submittedAtUtc;
        Sections = sections ?? EmptySections;
    }

    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string Status { get; init; }
    public string? CurrentStep { get; init; }
    public DateTimeOffset CreatedAtUtc { get; init; }
    public DateTimeOffset? UpdatedAtUtc { get; init; }
    public DateTimeOffset? SubmittedAtUtc { get; init; }
    public IReadOnlyDictionary<string, JsonElement> Sections { get; init; }
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
    public string? Approach { get; init; }
    public IReadOnlyList<string>? Languages { get; init; }
}

public sealed class ProviderSpecializationsSection
{
    public IReadOnlyList<string>? FocusAreas { get; init; }
    public IReadOnlyList<string>? AgeGroups { get; init; }
    public IReadOnlyList<string>? TherapyGoals { get; init; }
}

public sealed class ProviderModalitiesSection
{
    public IReadOnlyList<string>? Modalities { get; init; }
    public IReadOnlyList<string>? DeliveryModes { get; init; }
}

public sealed class ProviderSessionDetailsSection
{
    public IReadOnlyList<int>? SessionLengthsMinutes { get; init; }
    public string? AvailabilitySummary { get; init; }
    public int? CapacityPerWeek { get; init; }
}

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

public sealed class ProviderPayoutSection
{
    public string? PayoutMode { get; init; }
    public string? AccountHolderName { get; init; }
    public string? Notes { get; init; }
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
