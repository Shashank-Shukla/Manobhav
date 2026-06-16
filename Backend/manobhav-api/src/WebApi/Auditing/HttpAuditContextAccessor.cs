using System.Security.Claims;
using Infrastructure.Persistence;
using WebApi.Security;

namespace WebApi.Auditing;

public sealed class HttpAuditContextAccessor : IAuditContextAccessor
{
    private static readonly string[] ActorUserIdClaimTypes =
    [
        "app_user_id",
        "user_id",
        "actor_user_id"
    ];

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AuthOptions _authOptions;

    public HttpAuditContextAccessor(IHttpContextAccessor httpContextAccessor, AuthOptions authOptions)
    {
        _httpContextAccessor = httpContextAccessor;
        _authOptions = authOptions;
    }

    public AuditRequestContext Current
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext is null)
            {
                return AuditRequestContext.System;
            }

            var user = httpContext.User;
            return new AuditRequestContext(
                HasHttpContext: true,
                IsAuthenticated: user.Identity?.IsAuthenticated == true,
                ActorUserId: ReadActorUserId(user),
                ActorSubject: ReadActorSubject(user),
                CorrelationId: ReadCorrelationId(httpContext),
                RequestPath: httpContext.Request.Path.Value,
                IpAddress: httpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent: httpContext.Request.Headers.UserAgent.ToString(),
                IsAdmin: IsAdmin(user, _authOptions.AdminGroup));
        }
    }

    private static Guid? ReadActorUserId(ClaimsPrincipal user)
    {
        foreach (var claimType in ActorUserIdClaimTypes)
        {
            var value = user.FindFirst(claimType)?.Value;
            if (Guid.TryParse(value, out var actorUserId))
            {
                return actorUserId;
            }
        }

        return null;
    }

    private static string? ReadActorSubject(ClaimsPrincipal user)
    {
        var subject = user.FindFirst("sub")?.Value;
        return string.IsNullOrWhiteSpace(subject) ? null : subject;
    }

    private static string ReadCorrelationId(HttpContext httpContext)
    {
        return ReadHeader(httpContext, "X-Correlation-ID") ??
            ReadHeader(httpContext, "X-Request-ID") ??
            httpContext.TraceIdentifier;
    }

    private static string? ReadHeader(HttpContext httpContext, string headerName)
    {
        var value = httpContext.Request.Headers[headerName].ToString();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static bool IsAdmin(ClaimsPrincipal user, string adminGroup)
    {
        return user.FindAll("cognito:groups")
            .SelectMany(claim => claim.Value.Split([' ', ',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Any(group => string.Equals(group, adminGroup, StringComparison.Ordinal));
    }
}
