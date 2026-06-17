using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace WebApi.Security;

public sealed class AuthCookieManager(AuthOptions options)
{
    private const string EmailOtpSessionCookieName = "mbv_email_otp";

    public AuthSessionResponse SignIn(HttpResponse response, CognitoTokenSet tokens)
    {
        var expiresAtUtc = DateTimeOffset.UtcNow.AddSeconds(Math.Max(1, tokens.ExpiresIn));
        response.Cookies.Append(options.AccessTokenCookieName, tokens.AccessToken, BuildCookieOptions(httpOnly: true, expiresAtUtc));
        response.Cookies.Append(options.CsrfCookieName, CreateCsrfToken(), BuildCookieOptions(httpOnly: false, expiresAtUtc));
        return new AuthSessionResponse(true, expiresAtUtc, ReadGroupsFromAccessToken(tokens.AccessToken));
    }

    public string ReadOrCreateCsrfToken(HttpRequest request, HttpResponse response)
    {
        if (request.Cookies.TryGetValue(options.CsrfCookieName, out var token) && !string.IsNullOrWhiteSpace(token))
        {
            return token;
        }

        token = CreateCsrfToken();
        response.Cookies.Append(options.CsrfCookieName, token, BuildCookieOptions(httpOnly: false, DateTimeOffset.UtcNow.AddMinutes(15)));
        return token;
    }

    public void StoreEmailOtpSession(HttpResponse response, string value)
    {
        response.Cookies.Append(EmailOtpSessionCookieName, value, BuildCookieOptions(httpOnly: true, DateTimeOffset.UtcNow.AddMinutes(10)));
    }

    public string? ReadEmailOtpSession(HttpRequest request)
    {
        return request.Cookies.TryGetValue(EmailOtpSessionCookieName, out var value) ? value : null;
    }

    public void ClearEmailOtpSession(HttpResponse response)
    {
        response.Cookies.Delete(EmailOtpSessionCookieName, BuildDeleteOptions());
    }

    public AuthSessionResponse CreateSession(ClaimsPrincipal user)
    {
        return new AuthSessionResponse(user.Identity?.IsAuthenticated == true, ReadExpiry(user), ReadGroups(user));
    }

    public void SignOut(HttpResponse response)
    {
        response.Cookies.Delete(options.AccessTokenCookieName, BuildDeleteOptions());
        response.Cookies.Delete(options.CsrfCookieName, BuildDeleteOptions());
        ClearEmailOtpSession(response);
    }

    private CookieOptions BuildCookieOptions(bool httpOnly, DateTimeOffset expiresAtUtc)
    {
        var cookieOptions = BuildBaseCookieOptions();
        cookieOptions.HttpOnly = httpOnly;
        cookieOptions.Expires = expiresAtUtc;
        return cookieOptions;
    }

    private CookieOptions BuildDeleteOptions()
    {
        return BuildBaseCookieOptions();
    }

    private CookieOptions BuildBaseCookieOptions()
    {
        var cookieOptions = new CookieOptions
        {
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        };
        SetCookieDomain(cookieOptions);
        return cookieOptions;
    }

    private void SetCookieDomain(CookieOptions cookieOptions)
    {
        if (!string.IsNullOrWhiteSpace(options.CookieDomain))
        {
            cookieOptions.Domain = options.CookieDomain.Trim();
        }
    }

    private static IReadOnlyList<string> ReadGroups(ClaimsPrincipal user)
    {
        return user.FindAll("cognito:groups")
            .SelectMany(claim => claim.Value.Split([' ', ',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    private static IReadOnlyList<string> ReadGroupsFromAccessToken(string accessToken)
    {
        try
        {
            using var document = JsonDocument.Parse(DecodeJwtPayload(accessToken));
            return ReadGroups(document.RootElement);
        }
        catch (JsonException)
        {
            return [];
        }
        catch (FormatException)
        {
            return [];
        }
    }

    private static IReadOnlyList<string> ReadGroups(JsonElement payload)
    {
        return payload.TryGetProperty("cognito:groups", out var groups) && groups.ValueKind == JsonValueKind.Array
            ? groups.EnumerateArray().Select(ReadString).Where(IsPresent).Select(value => value!).ToArray()
            : [];
    }

    private static string DecodeJwtPayload(string token)
    {
        var parts = token.Split('.', 3);
        return parts.Length >= 2 ? Encoding.UTF8.GetString(Convert.FromBase64String(PadBase64Url(parts[1]))) : "{}";
    }

    private static string PadBase64Url(string value)
    {
        var normalized = value.Replace('-', '+').Replace('_', '/');
        return normalized.PadRight(normalized.Length + ((4 - normalized.Length % 4) % 4), '=');
    }

    private static string? ReadString(JsonElement element)
    {
        return element.ValueKind == JsonValueKind.String ? element.GetString() : null;
    }

    private static bool IsPresent(string? value)
    {
        return !string.IsNullOrWhiteSpace(value);
    }

    private static DateTimeOffset? ReadExpiry(ClaimsPrincipal user)
    {
        return long.TryParse(user.FindFirstValue("exp"), out var unixSeconds)
            ? DateTimeOffset.FromUnixTimeSeconds(unixSeconds)
            : null;
    }

    private static string CreateCsrfToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}
