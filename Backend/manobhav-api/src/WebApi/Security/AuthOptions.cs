namespace WebApi.Security;

public sealed class AuthOptions
{
    public bool Enabled { get; set; }
    public string CognitoAuthority { get; set; } = "";
    public string CognitoDomain { get; set; } = "";
    public string Audience { get; set; } = "";
    public string UserPoolId { get; set; } = "";
    public string CognitoAwsRegion { get; set; } = "";
    public string AdminGroup { get; set; } = "Admin";
    public bool RequireHttpsMetadata { get; set; } = true;
    public string CookieDomain { get; set; } = "";
    public string AccessTokenCookieName { get; set; } = "mbv_auth";
    public string CsrfCookieName { get; set; } = "mbv_csrf";
    public string CsrfHeaderName { get; set; } = "X-CSRF-Token";
    public int EmailOtpExpiryMinutes { get; set; } = 10;
    public int EmailOtpMaxFailedAttempts { get; set; } = 5;
    public int EmailOtpVerificationLockSeconds { get; set; } = 120;
    public string EmailOtpHmacSecret { get; set; } = "";
    public string OtpEmailFromAddress { get; set; } = "";
    public string OtpEmailFromDisplayName { get; set; } = "Manobhav";
    public string OtpEmailSubject { get; set; } = "Your Manobhav verification code";
}
