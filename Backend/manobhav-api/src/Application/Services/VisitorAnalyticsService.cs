using System.Text.Json;
using System.Text.RegularExpressions;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;

namespace Application.Services;

public sealed class VisitorAnalyticsOptions
{
    public bool Enabled { get; set; }
    public bool FullCaptureEnabled { get; set; }
    public bool FullCaptureLegalApproved { get; set; }
    public bool CapturePreciseLocation { get; set; }
    public int RetentionDays { get; set; } = 90;
}

public sealed class VisitorAnalyticsValidationException : Exception
{
    public VisitorAnalyticsValidationException(string message) : base(message)
    {
    }
}

public sealed partial class VisitorAnalyticsService : IVisitorAnalyticsService
{
    private static readonly string[] ProhibitedExactPropertyKeys =
    [
        "answer",
        "answertext",
        "answervalue",
        "fieldvalue",
        "freetext",
        "inputvalue",
        "rawanswer",
        "response"
    ];

    private static readonly string[] ProhibitedPropertyKeyFragments =
    [
        "authorization",
        "authheader",
        "card",
        "clinicalnote",
        "cookie",
        "cvv",
        "medicalrecord",
        "password",
        "payment",
        "secret",
        "sessionnote",
        "token"
    ];

    private readonly IVisitorAnalyticsRepository _repository;
    private readonly VisitorAnalyticsOptions _options;

    public VisitorAnalyticsService(IVisitorAnalyticsRepository repository, VisitorAnalyticsOptions options)
    {
        _repository = repository;
        _options = options;
    }

    public async Task<CreateVisitorResponse> CreateVisitorAsync(
        CreateVisitorRequest request,
        ServerVisitorTelemetry telemetry,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();

        var visitor = new VisitorSession
        {
            LandingPath = Limit(request.LandingPath, 256),
            IpAddress = Limit(telemetry.IpAddress, 128),
            UserAgent = Limit(telemetry.UserAgent, 512),
            Referrer = Limit(telemetry.Referrer, 1024),
            TimeZone = Limit(request.TimeZone, 80),
            DeviceInfo = Limit(request.DeviceInfo, 512),
            NetworkInfo = Limit(request.NetworkInfo, 256),
            UtmSource = Limit(request.UtmSource, 120),
            UtmMedium = Limit(request.UtmMedium, 120),
            UtmCampaign = Limit(request.UtmCampaign, 180)
        };

        await _repository.AddVisitorAsync(visitor, cancellationToken);
        return new CreateVisitorResponse(visitor.Id, _options.FullCaptureEnabled, _options.RetentionDays);
    }

    public async Task RecordEventAsync(Guid visitorId, VisitorEventRequest request, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        if (!_options.FullCaptureEnabled)
        {
            throw new VisitorAnalyticsValidationException("Full visitor event capture is not enabled.");
        }

        if (!await _repository.VisitorExistsAsync(visitorId, cancellationToken))
        {
            throw new VisitorAnalyticsValidationException("Visitor does not exist.");
        }

        ValidateEvent(request);

        var propertiesJson = JsonSerializer.Serialize(request.Properties ?? new Dictionary<string, string?>());
        if (propertiesJson.Length > 4096)
        {
            throw new VisitorAnalyticsValidationException("Analytics properties payload is too large.");
        }

        var visitorEvent = new VisitorEvent
        {
            VisitorSessionId = visitorId,
            EventType = request.EventType,
            Route = Limit(request.Route, 256) ?? "/",
            TargetKey = Limit(request.TargetKey, 160),
            PropertiesJson = propertiesJson,
            ClientTimestampUtc = request.ClientTimestampUtc
        };

        await _repository.AddEventAsync(visitorEvent, cancellationToken);
    }

    public async Task LinkVisitorToUserAsync(Guid visitorId, string userSubject, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        if (string.IsNullOrWhiteSpace(userSubject))
        {
            throw new VisitorAnalyticsValidationException("User subject is required.");
        }

        await _repository.LinkVisitorToUserAsync(visitorId, userSubject, cancellationToken);
    }

    private void EnsureConfigured()
    {
        EnsureAnalyticsEnabled();
        EnsureRetentionWindow();
        EnsureFullCaptureApproved();
        EnsurePreciseLocationApproved();
    }

    private static void ValidateEvent(VisitorEventRequest request)
    {
        ValidateEventType(request.EventType);
        ValidateRoute(request.Route);
        ValidatePropertyKeys(request.Properties);
    }

    private void EnsureAnalyticsEnabled()
    {
        if (!_options.Enabled)
        {
            throw new InvalidOperationException("Visitor analytics is disabled.");
        }
    }

    private void EnsureRetentionWindow()
    {
        if (_options.RetentionDays is < 1 or > 365)
        {
            throw new InvalidOperationException("Visitor analytics retention must be between 1 and 365 days.");
        }
    }

    private void EnsureFullCaptureApproved()
    {
        if (_options.FullCaptureEnabled && !_options.FullCaptureLegalApproved)
        {
            throw new InvalidOperationException("Full visitor capture requires documented legal/privacy approval.");
        }
    }

    private void EnsurePreciseLocationApproved()
    {
        if (_options.CapturePreciseLocation && !_options.FullCaptureLegalApproved)
        {
            throw new InvalidOperationException("Precise visitor location capture requires documented legal/privacy approval.");
        }
    }

    private static void ValidateEventType(string eventType)
    {
        if (string.IsNullOrWhiteSpace(eventType) || !EventTypePattern().IsMatch(eventType))
        {
            throw new VisitorAnalyticsValidationException("Event type is required and may contain only lowercase letters, numbers, dots, underscores, and hyphens.");
        }
    }

    private static void ValidateRoute(string route)
    {
        if (string.IsNullOrWhiteSpace(route) || route.Length > 256)
        {
            throw new VisitorAnalyticsValidationException("Route is required and must be 256 characters or fewer.");
        }
    }

    private static void ValidatePropertyKeys(IReadOnlyDictionary<string, string?>? properties)
    {
        if (properties is null)
        {
            return;
        }

        foreach (var key in properties.Keys)
        {
            ValidatePropertyKey(key);
        }
    }

    private static void ValidatePropertyKey(string key)
    {
        var normalized = NormalizeKey(key);
        if (ProhibitedExactPropertyKeys.Contains(normalized) || ProhibitedPropertyKeyFragments.Any(normalized.Contains))
        {
            throw new VisitorAnalyticsValidationException($"Analytics property '{key}' is not allowed because it may contain sensitive data.");
        }
    }

    private static string? Limit(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private static string NormalizeKey(string key)
    {
        return new string(key.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
    }

    [GeneratedRegex("^[a-z0-9._-]{1,120}$")]
    private static partial Regex EventTypePattern();
}
