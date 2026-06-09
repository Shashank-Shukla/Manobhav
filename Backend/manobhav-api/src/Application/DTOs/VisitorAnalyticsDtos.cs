namespace Application.DTOs;

public sealed record CreateVisitorRequest(
    string? LandingPath,
    string? TimeZone = null,
    string? DeviceInfo = null,
    string? NetworkInfo = null,
    string? UtmSource = null,
    string? UtmMedium = null,
    string? UtmCampaign = null);

public sealed record CreateVisitorResponse(
    Guid VisitorId,
    bool FullCaptureEnabled,
    int RetentionDays);

public sealed record VisitorEventRequest(
    string EventType,
    string Route,
    string? TargetKey,
    IReadOnlyDictionary<string, string?>? Properties,
    DateTimeOffset? ClientTimestampUtc);

public sealed record LinkVisitorRequest(Guid VisitorId);

public sealed record ServerVisitorTelemetry(string? IpAddress, string? UserAgent, string? Referrer);
