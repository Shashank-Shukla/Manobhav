namespace Application.Services;

public sealed class ProviderOnboardingNotificationOptions
{
    public const string DefaultAwsRegion = "ap-south-2";

    /// <summary>
    /// Admin notification recipients. These MUST be supplied via configuration
    /// (e.g. SSM at <c>ProviderOnboarding:AdminNotifications:AdminRecipients</c>).
    /// There are intentionally no hardcoded recipient defaults so applicant data
    /// can never be emailed to an unmanaged personal inbox.
    /// </summary>
    public IReadOnlyList<string> AdminRecipients { get; init; } = [];
    public string FromEmail { get; init; } = "no-reply@manobhav.co.in";
    public string FromDisplayName { get; init; } = "Manobhav";
    public string AwsRegion { get; init; } = DefaultAwsRegion;

    public IReadOnlyList<string> GetEffectiveAdminRecipients()
    {
        return AdminRecipients
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
    DateTimeOffset SubmittedAtUtc);

public interface IProviderOnboardingAdminNotifier
{
    Task NotifySubmittedAsync(ProviderOnboardingAdminNotification notification, CancellationToken cancellationToken);
}
