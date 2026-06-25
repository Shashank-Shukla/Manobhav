using System.Net.Mail;
using System.Text;
using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;
using Application.Services;
using Microsoft.Extensions.Options;

namespace WebApi.Notifications;

public sealed record SesEmail(
    string FromEmailAddress,
    IReadOnlyList<string> ToAddresses,
    string Subject,
    string TextBody);

public interface ISesEmailClient
{
    Task SendEmailAsync(SesEmail email, CancellationToken cancellationToken);
}

public sealed class AwsSesEmailClient(IAmazonSimpleEmailServiceV2 sesClient) : ISesEmailClient
{
    public Task SendEmailAsync(SesEmail email, CancellationToken cancellationToken)
    {
        var request = new SendEmailRequest
        {
            FromEmailAddress = email.FromEmailAddress,
            Destination = new Destination
            {
                ToAddresses = [.. email.ToAddresses]
            },
            Content = new EmailContent
            {
                Simple = new Message
                {
                    Subject = new Content
                    {
                        Data = email.Subject,
                        Charset = Encoding.UTF8.WebName
                    },
                    Body = new Body
                    {
                        Text = new Content
                        {
                            Data = email.TextBody,
                            Charset = Encoding.UTF8.WebName
                        }
                    }
                }
            }
        };

        return sesClient.SendEmailAsync(request, cancellationToken);
    }
}

public sealed class SesProviderOnboardingAdminNotifier(
    ISesEmailClient sesClient,
    IOptions<ProviderOnboardingNotificationOptions> options,
    ILogger<SesProviderOnboardingAdminNotifier> logger) : IProviderOnboardingAdminNotifier
{
    public async Task NotifySubmittedAsync(ProviderOnboardingAdminNotification notification, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        var email = BuildEmail(notification, settings);

        try
        {
            await sesClient.SendEmailAsync(email, cancellationToken);
            logger.LogInformation(
                "Sent provider onboarding admin notification for application {ApplicationId} to {RecipientCount} recipient(s).",
                notification.ApplicationId,
                email.ToAddresses.Count);
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Failed to send provider onboarding admin notification for application {ApplicationId} via SES.",
                notification.ApplicationId);
            throw;
        }
    }

    internal static SesEmail BuildEmail(
        ProviderOnboardingAdminNotification notification,
        ProviderOnboardingNotificationOptions settings)
    {
        var recipients = settings.GetEffectiveAdminRecipients();
        if (recipients.Count == 0)
        {
            throw new InvalidOperationException("Provider onboarding admin notification recipients are not configured.");
        }

        if (string.IsNullOrWhiteSpace(settings.FromEmail))
        {
            throw new InvalidOperationException("Provider onboarding admin notification sender is not configured.");
        }

        return new SesEmail(
            FormatFromAddress(settings),
            recipients,
            $"Provider application ready for review: {GetProviderName(notification)}",
            BuildBody(notification));
    }

    private static string BuildBody(ProviderOnboardingAdminNotification notification)
    {
        // Intentionally minimal: only non-sensitive identifiers go over email.
        // Applicant contact details, credentials, and documents are never emailed;
        // reviewers open the secured admin dashboard to see them.
        return new StringBuilder()
            .AppendLine("A provider application has been submitted for admin review.")
            .AppendLine()
            .AppendLine($"Application ID: {notification.ApplicationId}")
            .AppendLine($"User ID: {notification.UserId}")
            .AppendLine($"Provider: {GetProviderName(notification)}")
            .AppendLine($"Submitted at UTC: {notification.SubmittedAtUtc:O}")
            .AppendLine()
            .AppendLine("Open the Manobhav admin dashboard to review this application. Applicant contact details, credentials, and uploaded documents are intentionally omitted from this email and remain only in the secured system.")
            .ToString();
    }

    private static string FormatFromAddress(ProviderOnboardingNotificationOptions settings)
    {
        if (string.IsNullOrWhiteSpace(settings.FromDisplayName))
        {
            return settings.FromEmail;
        }

        return new MailAddress(settings.FromEmail, settings.FromDisplayName).ToString();
    }

    private static string GetProviderName(ProviderOnboardingAdminNotification notification)
    {
        return string.IsNullOrWhiteSpace(notification.ProviderDisplayName)
            ? "Provider applicant"
            : notification.ProviderDisplayName;
    }
}
