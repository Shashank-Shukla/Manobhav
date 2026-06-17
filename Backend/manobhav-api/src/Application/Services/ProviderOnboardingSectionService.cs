using System.Text.Json;
using System.Text.Json.Nodes;
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
        RequireText(section.Approach, "Approach", 1200);
        ValidateTextList(section.Languages, "Languages", required: true);
        return section;
    }

    private static ProviderSpecializationsSection ValidateSpecializations(ProviderSpecializationsSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Specializations section is required.");
        }

        ValidateTextList(section.FocusAreas, "Focus areas", required: true);
        ValidateTextList(section.AgeGroups, "Age groups", required: false);
        ValidateTextList(section.TherapyGoals, "Therapy goals", required: false);
        return section;
    }

    private static ProviderModalitiesSection ValidateModalities(ProviderModalitiesSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Modalities section is required.");
        }

        ValidateTextList(section.Modalities, "Modalities", required: true);
        ValidateTextList(section.DeliveryModes, "Delivery modes", required: true);
        return section;
    }

    private static ProviderSessionDetailsSection ValidateSessionDetails(ProviderSessionDetailsSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Session details section is required.");
        }

        ValidateSessionLengths(section.SessionLengthsMinutes);
        RequireText(section.AvailabilitySummary, "Availability summary", 1200);
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

    private static ProviderPayoutSection ValidatePayout(ProviderPayoutSection? section)
    {
        if (section is null)
        {
            throw new ProviderOnboardingValidationException("Payout placeholder section is required.");
        }

        RequireText(section.PayoutMode, "Payout mode", 80);
        OptionalText(section.AccountHolderName, "Account holder name", 200);
        OptionalText(section.Notes, "Payout notes", 800);
        return section;
    }

    private static void ValidateSessionLengths(IReadOnlyList<int>? values)
    {
        if (values is null || values.Count == 0)
        {
            throw new ProviderOnboardingValidationException("Session lengths are required.");
        }

        if (values.Count > 5 || values.Any(value => value is < 15 or > 180))
        {
            throw new ProviderOnboardingValidationException("Session lengths must be between 15 and 180 minutes.");
        }
    }

    private static void ValidateCapacity(int? capacityPerWeek)
    {
        if (capacityPerWeek is null or < 1 or > 80)
        {
            throw new ProviderOnboardingValidationException("Capacity per week must be between 1 and 80.");
        }
    }

    private static void ValidateTextList(IReadOnlyList<string>? values, string label, bool required)
    {
        if (values is null || values.Count == 0)
        {
            if (required)
            {
                throw new ProviderOnboardingValidationException($"{label} are required.");
            }

            return;
        }

        if (values.Count > 20 || values.Any(value => string.IsNullOrWhiteSpace(value) || value.Length > 120))
        {
            throw new ProviderOnboardingValidationException($"{label} must contain 20 or fewer non-empty items.");
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
