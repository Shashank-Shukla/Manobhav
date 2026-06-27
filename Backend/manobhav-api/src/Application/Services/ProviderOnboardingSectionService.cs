using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Application.DTOs;
using Domain.Entities;

namespace Application.Services;

public sealed class ProviderOnboardingValidationException : Exception
{
    public ProviderOnboardingValidationException(string message) : base(message)
    {
    }
}

public sealed class ProviderOnboardingSectionService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>Indian bank account number: 9 to 18 digits.</summary>
    private const string AccountNumberPattern = "^[0-9]{9,18}$";

    /// <summary>RBI IFSC code: four-letter bank code, a literal '0', then a six-character branch code.</summary>
    private const string IfscPattern = "^[A-Z]{4}0[A-Z0-9]{6}$";

    /// <summary>24-hour clock time of day in "HH:mm" format.</summary>
    private const string TimeOfDayPattern = "^([01][0-9]|2[0-3]):[0-5][0-9]$";
    private static readonly HashSet<string> SectionKeys =
    [
        "basic-profile",
        "bio",
        "specializations",
        "modalities",
        "session-details",
        "credentials",
        "payout"
    ];
    private static readonly HashSet<string> CurrentStepKeys = [.. SectionKeys, "review"];

    public IReadOnlySet<string> KnownSectionKeys => SectionKeys;

    public void ValidateApplicationComplete(ProviderOnboardingApplication application)
    {
        var sections = ProviderOnboardingSectionCatalog.BuildReviewSections(application);
        var missingSections = ProviderOnboardingSectionCatalog.GetMissingRequiredReviewSectionKeys(sections);
        if (missingSections.Count > 0)
        {
            throw new ProviderOnboardingValidationException(
                $"Provider application is incomplete. Missing required sections: {string.Join(", ", missingSections)}.");
        }

        ValidateBasicIdentity(DeserializeSection<ProviderBasicIdentitySection>(sections, ProviderOnboardingSectionCatalog.BasicIdentity));
        ValidateBio(DeserializeSection<ProviderBioSection>(sections, ProviderOnboardingSectionCatalog.BioAndApproach));
        ValidateSpecializations(DeserializeSection<ProviderSpecializationsSection>(sections, ProviderOnboardingSectionCatalog.Specializations));
        ValidateModalities(DeserializeSection<ProviderModalitiesSection>(sections, ProviderOnboardingSectionCatalog.TherapyApproaches));
        ValidateSessionDetails(DeserializeSection<ProviderSessionDetailsSection>(sections, ProviderOnboardingSectionCatalog.SessionDetails));
        ValidateCredentials(DeserializeSection<ProviderCredentialsSection>(sections, ProviderOnboardingSectionCatalog.Credentials));
        ValidatePayout(DeserializeSection<ProviderPayoutSection>(sections, ProviderOnboardingSectionCatalog.Payout));
    }

    public void ApplySection(ProviderOnboardingApplication application, string sectionKey, SaveProviderSectionRequest request)
    {
        if (!SectionKeys.Contains(sectionKey))
        {
            throw new ProviderOnboardingValidationException("Unknown provider onboarding section.");
        }

        if (request.ExtensionData?.Count > 0)
        {
            throw new ProviderOnboardingValidationException("Provider section contains unsupported fields.");
        }

        WriteSection(application, sectionKey, request);
        application.CurrentStep = NormalizeCurrentStep(sectionKey, request.CurrentStep);
        application.UpdatedAtUtc = DateTimeOffset.UtcNow;
    }

    private static void WriteSection(ProviderOnboardingApplication application, string sectionKey, SaveProviderSectionRequest request)
    {
        switch (sectionKey)
        {
            case "basic-profile":
                application.BasicProfileJson = Serialize(ValidateBasicIdentity(request.BasicIdentity));
                break;
            case "bio":
                application.BioJson = PutSection(application.BioJson, "bio", ValidateBio(request.Bio));
                break;
            case "specializations":
                application.BioJson = PutSection(application.BioJson, "specializations", ValidateSpecializations(request.Specializations));
                break;
            case "modalities":
                application.BioJson = PutSection(application.BioJson, "modalities", ValidateModalities(request.Modalities));
                break;
            case "session-details":
                application.SessionDetailsJson = PutSection(application.SessionDetailsJson, "sessionDetails", ValidateSessionDetails(request.SessionDetails));
                break;
            case "credentials":
                application.SessionDetailsJson = PutSection(application.SessionDetailsJson, "credentials", ValidateCredentials(request.Credentials));
                break;
            case "payout":
                application.SessionDetailsJson = PutSection(application.SessionDetailsJson, "payout", ValidatePayout(request.Payout));
                break;
        }
    }

    private string NormalizeCurrentStep(string sectionKey, string? currentStep)
    {
        return string.IsNullOrWhiteSpace(currentStep) || !CurrentStepKeys.Contains(currentStep)
            ? sectionKey
            : currentStep;
    }

    private static ProviderBasicIdentitySection ValidateBasicIdentity(ProviderBasicIdentitySection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Basic identity section is required.");
        }

        RequireText(section.LegalName, "Legal name", 160);
        RequireText(section.DisplayName, "Display name", 160);
        RequireText(section.Email, "Email", 320);
        OptionalText(section.Phone, "Phone", 40);
        OptionalText(section.Location, "Location", 160);
        return section;
    }

    private static ProviderBioSection ValidateBio(ProviderBioSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Bio section is required.");
        }

        RequireText(section.ShortBio, "Short bio", 300);
        OptionalText(section.LongBio, "Long bio", 2000);
        ValidateTextList(section.Languages, "Languages", required: true);
        return section;
    }

    /// <summary>
    /// Validates the specializations section. Both focus areas and age groups are
    /// required; focus areas allow up to 80 entries while age groups use the default cap.
    /// </summary>
    private static ProviderSpecializationsSection ValidateSpecializations(ProviderSpecializationsSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Specializations section is required.");
        }

        ValidateTextList(section.FocusAreas, "Focus areas", required: true, maxCount: 80);
        ValidateTextList(section.AgeGroups, "Age groups", required: true);
        return section;
    }

    private static ProviderModalitiesSection ValidateModalities(ProviderModalitiesSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Modalities section is required.");
        }

        ValidateTextList(section.Modalities, "Modalities", required: true);
        return section;
    }

    private static ProviderSessionDetailsSection ValidateSessionDetails(ProviderSessionDetailsSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Session details section is required.");
        }

        ValidateAvailabilitySlots(section.AvailabilitySlots);
        ValidateCapacity(section.CapacityPerWeek);
        return section;
    }

    private static ProviderCredentialsSection ValidateCredentials(ProviderCredentialsSection? section)
    {
        if (section?.Items is null || section.Items.Count == 0)
        {
            throw new ProviderOnboardingValidationException("At least one credential metadata item is required.");
        }

        if (section.Items.Count > 10)
        {
            throw new ProviderOnboardingValidationException("Credential metadata can include at most 10 items.");
        }

        foreach (var item in section.Items)
        {
            RequireText(item.CredentialType, "Credential type", 80);
            RequireText(item.Title, "Credential title", 200);
            OptionalText(item.Institution, "Institution", 200);
            OptionalText(item.LicenseNumber, "License number", 120);
        }

        return section;
    }

    /// <summary>
    /// Validates Indian bank payout details. Account number must be 9–18 digits
    /// (<c>^[0-9]{9,18}$</c>); IFSC code must be the 11-character RBI format
    /// (<c>^[A-Z]{4}0[A-Z0-9]{6}$</c>: four-letter bank code, a literal '0', then a
    /// six-character branch code); bank name is required text.
    /// </summary>
    private static ProviderPayoutSection ValidatePayout(ProviderPayoutSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Payout section is required.");
        }

        if (!Matches(section.AccountNumber, AccountNumberPattern))
        {
            throw new ProviderOnboardingValidationException("Account number is required and must be 9 to 18 digits.");
        }

        if (!Matches(section.IfscCode, IfscPattern))
        {
            throw new ProviderOnboardingValidationException("IFSC code is required and must be in the format ABCD0123456.");
        }

        RequireText(section.BankName, "Bank name", 160);
        return section;
    }

    private static bool Matches(string? value, string pattern)
    {
        return !string.IsNullOrWhiteSpace(value) && Regex.IsMatch(value, pattern);
    }

    /// <summary>
    /// Validates the weekly availability slots. At least one slot is required and at most
    /// 50 are allowed. Each slot must have a <c>DayOfWeek</c> in 0..6 (0=Sunday..6=Saturday),
    /// <c>StartTime</c> and <c>EndTime</c> in 24-hour "HH:mm" format, and a start strictly
    /// earlier than the end (an ordinal string compare on "HH:mm" is equivalent to a time compare).
    /// </summary>
    private static void ValidateAvailabilitySlots(IReadOnlyList<AvailabilitySlotDto>? slots)
    {
        if (slots is null || slots.Count == 0)
        {
            throw new ProviderOnboardingValidationException("Availability is required.");
        }

        if (slots.Count > 50)
        {
            throw new ProviderOnboardingValidationException("Availability can include at most 50 slots.");
        }

        foreach (var slot in slots)
        {
            if (slot.DayOfWeek is < 0 or > 6)
            {
                throw new ProviderOnboardingValidationException("Availability day of week must be between 0 (Sunday) and 6 (Saturday).");
            }

            if (!Matches(slot.StartTime, TimeOfDayPattern) || !Matches(slot.EndTime, TimeOfDayPattern))
            {
                throw new ProviderOnboardingValidationException("Availability times must be in 24-hour HH:mm format.");
            }

            if (string.CompareOrdinal(slot.StartTime, slot.EndTime) >= 0)
            {
                throw new ProviderOnboardingValidationException("Availability start time must be earlier than end time.");
            }
        }
    }

    private static void ValidateCapacity(int? capacityPerWeek)
    {
        if (capacityPerWeek is null or < 1 or > 80)
        {
            throw new ProviderOnboardingValidationException("Capacity per week must be between 1 and 80.");
        }
    }

    private static void ValidateTextList(IReadOnlyList<string>? values, string label, bool required, int maxCount = 20)
    {
        if (values is null || values.Count == 0)
        {
            if (required)
            {
                throw new ProviderOnboardingValidationException($"{label} are required.");
            }

            return;
        }

        if (values.Count > maxCount || values.Any(value => string.IsNullOrWhiteSpace(value) || value.Length > 120))
        {
            throw new ProviderOnboardingValidationException($"{label} must contain {maxCount} or fewer non-empty items.");
        }
    }

    private static void RequireText(string? value, string label, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > maxLength)
        {
            throw new ProviderOnboardingValidationException($"{label} is required and must be {maxLength} characters or fewer.");
        }
    }

    private static void OptionalText(string? value, string label, int maxLength)
    {
        if (value?.Length > maxLength)
        {
            throw new ProviderOnboardingValidationException($"{label} must be {maxLength} characters or fewer.");
        }
    }

    private static TSection? DeserializeSection<TSection>(
        IReadOnlyDictionary<string, JsonElement> sections,
        string sectionKey)
    {
        try
        {
            return sections[sectionKey].Deserialize<TSection>(JsonOptions);
        }
        catch (JsonException)
        {
            throw new ProviderOnboardingValidationException($"{sectionKey} section is invalid.");
        }
    }

    private static string PutSection(string currentJson, string sectionName, object value)
    {
        var root = ParseObject(currentJson);
        root[sectionName] = JsonSerializer.SerializeToNode(value, JsonOptions);
        return root.ToJsonString(JsonOptions);
    }

    private static JsonObject ParseObject(string currentJson)
    {
        try
        {
            return JsonNode.Parse(string.IsNullOrWhiteSpace(currentJson) ? "{}" : currentJson)?.AsObject() ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string Serialize(object value)
    {
        return JsonSerializer.Serialize(value, JsonOptions);
    }
}
