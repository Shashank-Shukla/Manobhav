using System.Text.Json;
using Domain.Entities;

namespace Application.Services;

public static class ProviderOnboardingSectionCatalog
{
    public const string BasicIdentity = "basicIdentity";
    public const string BioAndApproach = "bioAndApproach";
    public const string Specializations = "specializations";
    public const string TherapyApproaches = "therapyApproaches";
    public const string SessionDetails = "sessionDetails";
    public const string Credentials = "credentials";
    public const string Payout = "payout";

    private static readonly string[] RequiredReviewSections =
    [
        BasicIdentity,
        BioAndApproach,
        Specializations,
        TherapyApproaches,
        SessionDetails,
        Credentials,
        Payout
    ];

    private static readonly HashSet<string> RequiredReviewSectionSet = new(RequiredReviewSections, StringComparer.Ordinal);

    public static IReadOnlyList<string> RequiredReviewSectionKeys => RequiredReviewSections;

    public static bool IsRequiredReviewSectionKey(string sectionKey)
    {
        return RequiredReviewSectionSet.Contains(sectionKey);
    }

    public static IReadOnlyList<string> GetMissingRequiredReviewSectionKeys(IReadOnlyDictionary<string, JsonElement> sections)
    {
        return RequiredReviewSections
            .Where(sectionKey => !sections.ContainsKey(sectionKey))
            .ToList();
    }

    public static IReadOnlyDictionary<string, JsonElement> BuildReviewSections(ProviderOnboardingApplication application)
    {
        var sections = new Dictionary<string, JsonElement>(StringComparer.Ordinal);

        AddRootSection(sections, BasicIdentity, application.BasicProfileJson);
        AddNestedSection(sections, application.BioJson, "bio", BioAndApproach);
        AddNestedSection(sections, application.BioJson, "specializations", Specializations);
        AddNestedSection(sections, application.BioJson, "modalities", TherapyApproaches);
        AddNestedSection(sections, application.SessionDetailsJson, "sessionDetails", SessionDetails);
        AddNestedSection(sections, application.SessionDetailsJson, "credentials", Credentials);
        AddNestedSection(sections, application.SessionDetailsJson, "payout", Payout);

        return sections;
    }

    private static void AddRootSection(IDictionary<string, JsonElement> sections, string sectionKey, string json)
    {
        if (TryParseObject(json, out var element) && element.EnumerateObject().Any())
        {
            sections[sectionKey] = element;
        }
    }

    private static void AddNestedSection(IDictionary<string, JsonElement> sections, string json, string storedKey, string sectionKey)
    {
        if (!TryParseObject(json, out var root) ||
            !root.TryGetProperty(storedKey, out var section) ||
            section.ValueKind != JsonValueKind.Object ||
            !section.EnumerateObject().Any())
        {
            return;
        }

        sections[sectionKey] = section.Clone();
    }

    private static bool TryParseObject(string json, out JsonElement element)
    {
        element = default;
        if (string.IsNullOrWhiteSpace(json))
        {
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            element = document.RootElement.Clone();
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
