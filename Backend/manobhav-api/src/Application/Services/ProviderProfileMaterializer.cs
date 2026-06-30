using System.Text.Json;
using Application.DTOs;
using Domain.Entities;

namespace Application.Services;

/// <summary>
/// Maps a provider's submitted onboarding application (the section JSON blobs) onto the public
/// <see cref="ProviderProfile"/>. Centralising the mapping here means provider approval, profile
/// re-publish, and the historical backfill all populate the directory the same way — the bug that
/// previously left published profiles blank was a single missing call to this logic.
/// </summary>
public sealed class ProviderProfileMaterializer
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Copies name, short/long bio, focus areas, languages, location and recurring weekly
    /// availability from the application onto the profile. Safe to call repeatedly.
    /// </summary>
    public void Apply(ProviderProfile profile, ProviderOnboardingApplication application)
    {
        var (displayName, legalName) = ReadApplicationNames(application);
        var combinedName = NameFormatter.ToTitleCase(FirstNonEmpty(displayName, legalName));
        profile.Name = combinedName ?? "Provider";
        profile.DisplayName = combinedName;

        var basic = ReadSection<ProviderBasicIdentitySection>(application.BasicProfileJson, nestedProperty: null);
        if (!string.IsNullOrWhiteSpace(basic?.Location))
        {
            profile.Location = basic!.Location!.Trim();
        }

        var bio = ReadSection<ProviderBioSection>(application.BioJson, "bio");
        profile.Summary = Clamp(bio?.ShortBio, 512);
        profile.LongDescription = Clamp(bio?.LongBio, 2000);
        profile.Bio = string.IsNullOrWhiteSpace(bio?.LongBio) ? null : Clamp(bio!.LongBio, 2000);
        profile.LanguagesJson = SerializeStrings(bio?.Languages);

        var specializations = ReadSection<ProviderSpecializationsSection>(application.BioJson, "specializations");
        profile.SpecializationsJson = SerializeStrings(specializations?.FocusAreas);

        var sessionDetails = ReadSection<ProviderSessionDetailsSection>(application.SessionDetailsJson, "sessionDetails");
        profile.WeeklyAvailabilityJson = SerializeWeeklyAvailability(sessionDetails?.AvailabilitySlots);
    }

    /// <summary>
    /// Deserializes a typed section from a section JSON blob. When <paramref name="nestedProperty"/>
    /// is supplied the section lives under that key (e.g. <c>BioJson.bio</c>); otherwise the whole
    /// document is the section (e.g. <c>BasicProfileJson</c>). Returns null on any malformed input.
    /// </summary>
    private static T? ReadSection<T>(string json, string? nestedProperty) where T : class
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            if (nestedProperty is null)
            {
                return JsonSerializer.Deserialize<T>(json, JsonOptions);
            }

            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                !document.RootElement.TryGetProperty(nestedProperty, out var nested))
            {
                return null;
            }

            return nested.Deserialize<T>(JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static (string? DisplayName, string? LegalName) ReadApplicationNames(ProviderOnboardingApplication application)
    {
        try
        {
            using var document = JsonDocument.Parse(application.BasicProfileJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return (null, null);
            }

            return (ReadStringProperty(document.RootElement, "displayName"), ReadStringProperty(document.RootElement, "legalName"));
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }

    private static string? ReadStringProperty(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private static string? FirstNonEmpty(params string?[] candidates)
    {
        return candidates.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    private static string Clamp(string? value, int maxLength)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string SerializeStrings(IReadOnlyList<string>? values)
    {
        var cleaned = (values ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .ToList();
        return JsonSerializer.Serialize(cleaned);
    }

    /// <summary>
    /// Normalizes the onboarding weekly slots into the directory's wire shape
    /// (<c>{ dayOfWeek, startTime, endTime }</c>, dayOfWeek 0=Sunday..6=Saturday), dropping any
    /// entry whose times aren't 24-hour "HH:mm". This JSON is read verbatim by the public API.
    /// </summary>
    private static string SerializeWeeklyAvailability(IReadOnlyList<AvailabilitySlotDto>? slots)
    {
        var cleaned = (slots ?? [])
            .Where(slot => slot is not null && IsTimeOfDay(slot.StartTime) && IsTimeOfDay(slot.EndTime))
            .Select(slot => new
            {
                dayOfWeek = ((slot.DayOfWeek % 7) + 7) % 7,
                startTime = slot.StartTime,
                endTime = slot.EndTime,
            })
            .ToList();
        return JsonSerializer.Serialize(cleaned);
    }

    private static bool IsTimeOfDay(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length != 5 || value[2] != ':')
        {
            return value == "24:00";
        }

        return int.TryParse(value[..2], out var hours) && hours is >= 0 and <= 23 &&
            int.TryParse(value[3..], out var minutes) && minutes is >= 0 and <= 59;
    }
}
