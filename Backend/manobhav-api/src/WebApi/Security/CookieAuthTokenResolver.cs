using Microsoft.AspNetCore.Http;

namespace WebApi.Security;

public sealed record CookieAuthTokenResult(string? Token, bool ShouldRejectBearer);

public static class CookieAuthTokenResolver
{
    public static CookieAuthTokenResult Resolve(HttpRequest request, AuthOptions options)
    {
        var token = ReadCookie(request, options.AccessTokenCookieName);
        return new CookieAuthTokenResult(token, string.IsNullOrWhiteSpace(token) && request.Headers.ContainsKey("Authorization"));
    }

    private static string? ReadCookie(HttpRequest request, string cookieName)
    {
        return request.Cookies.TryGetValue(cookieName, out var token) && !string.IsNullOrWhiteSpace(token)
            ? token
            : null;
    }
}
