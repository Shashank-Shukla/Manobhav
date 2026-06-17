using System.Text.Json;

namespace Application.Services;

public sealed class ProviderOnboardingNotificationOptions
{
    public const string DefaultAwsRegion = "ap-south-1";

    public static readonly IReadOnlyList<string> DefaultAdminRecipients =
    [
        "shashankshowstoper@gmail.com",
        "manobhavcounsellingservices@gmail.com"
    ];

    public IReadOnlyList<string> AdminRecipients { get; init; } = [.. DefaultAdminRecipients];
    public string FromEmail { get; init; } = "no-reply@manobhav.co.in";
    public string FromDisplayName { get; init; } = "Manobhav";
    public string AwsRegion { get; init; } = DefaultAwsRegion;

    public IReadOnlyList<string> GetEffectiveAdminRecipients()
    {
        return AdminRecipients
            .Concat(DefaultAdminRecipients)
            .Where(recipient => !string.IsNullOrWhiteSpace(recipient))
            .Select(recipient => recipient.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }
}

public sealed record ProviderOnboardingAdminNotification(
    Guid ApplicationId,
    Guid UserId,
    string ProviderDisplayName,
    string? ProviderEmail,
    DateTimeOffset SubmittedAtUtc,
    IReadOnlyDictionary<string, JsonElement> Sections);

public interface IProviderOnboardingAdminNotifier
{
    Task NotifySubmittedAsync(ProviderOnboardingAdminNotification notification, CancellationToken cancellationToken);
}
