namespace Infrastructure.Persistence;

public sealed record AuditRequestContext(
    bool HasHttpContext,
    bool IsAuthenticated,
    Guid? ActorUserId,
    string? ActorSubject,
    string? CorrelationId,
    string? RequestPath,
    string? IpAddress,
    string? UserAgent,
    bool IsAdmin)
{
    public static AuditRequestContext System { get; } = new(
        HasHttpContext: false,
        IsAuthenticated: false,
        ActorUserId: null,
        ActorSubject: null,
        CorrelationId: null,
        RequestPath: null,
        IpAddress: null,
        UserAgent: null,
        IsAdmin: false);
}

public interface IAuditContextAccessor
{
    AuditRequestContext Current { get; }
}
