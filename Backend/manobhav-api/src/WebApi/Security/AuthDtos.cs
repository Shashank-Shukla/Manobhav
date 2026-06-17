namespace WebApi.Security;

public sealed record AuthCallbackRequest(string Code, string CodeVerifier, string RedirectUri);

public sealed record CsrfTokenResponse(string CsrfToken);

public sealed record EmailOtpAuthRequest(string Email, string Flow);

public sealed record EmailOtpVerifyRequest(string Email, string Flow, string Otp);

public sealed record AuthSessionResponse(
    bool IsAuthenticated,
    DateTimeOffset? ExpiresAtUtc,
    IReadOnlyList<string> Groups);

public sealed record CognitoTokenSet(
    string AccessToken,
    string? IdToken,
    string? RefreshToken,
    int ExpiresIn);
