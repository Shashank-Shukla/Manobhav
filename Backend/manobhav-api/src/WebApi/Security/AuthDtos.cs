namespace WebApi.Security;

public sealed record AuthCallbackRequest(string Code, string CodeVerifier, string RedirectUri);

public sealed record CsrfTokenResponse(string CsrfToken);

public sealed record EmailOtpAuthRequest(string Email, string Flow);

public sealed record EmailOtpAuthResponse(
    Guid ChallengeId,
    string Email,
    string Flow,
    DateTimeOffset ExpiresAtUtc,
    DateTimeOffset ResendAvailableAtUtc,
    int RetryAfterSeconds,
    int SendsRemainingThisHour);

public sealed record EmailOtpVerifyRequest(string Email, string Flow, Guid ChallengeId, string Otp);

public sealed record EmailOtpVerifyResponse(
    string Status,
    AuthSessionResponse? Session,
    EmailOtpAuthResponse? Challenge,
    string? Message);

public sealed record AuthSessionResponse(
    bool IsAuthenticated,
    DateTimeOffset? ExpiresAtUtc,
    IReadOnlyList<string> Groups,
    string? Email = null,
    string? Name = null);

public sealed record CognitoTokenSet(
    string AccessToken,
    string? IdToken,
    string? RefreshToken,
    int ExpiresIn);
