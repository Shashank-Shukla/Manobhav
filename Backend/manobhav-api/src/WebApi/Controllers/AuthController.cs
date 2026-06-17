using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApi.Security;

namespace WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    ICognitoTokenExchange tokenExchange,
    AuthCookieManager cookies,
    ICognitoEmailOtpAuth emailOtpAuth) : ControllerBase
{
    [HttpGet("csrf-token")]
    [Authorize]
    public ActionResult<CsrfTokenResponse> CsrfToken()
    {
        return Ok(new CsrfTokenResponse(cookies.ReadOrCreateCsrfToken(Request, Response)));
    }

    [HttpPost("callback")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthSessionResponse>> CompleteCallback(
        [FromBody] AuthCallbackRequest? request,
        CancellationToken cancellationToken)
    {
        if (HasMissingCallbackField(request))
        {
            return Problem(title: "Auth callback request is incomplete.", statusCode: StatusCodes.Status400BadRequest);
        }

        var tokens = await tokenExchange.ExchangeCodeAsync(request!, cancellationToken);
        return Ok(cookies.SignIn(Response, tokens));
    }

    [HttpPost("email-otp/request")]
    [AllowAnonymous]
    public async Task<IActionResult> RequestEmailOtp(
        [FromBody] EmailOtpAuthRequest? request,
        CancellationToken cancellationToken)
    {
        if (HasMissingEmailOtpRequestField(request))
        {
            return Problem(title: "Email OTP request is incomplete.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            var challenge = await emailOtpAuth.RequestAsync(Normalize(request!), cancellationToken);
            cookies.StoreEmailOtpSession(Response, EncodeEmailOtpSession(new EmailOtpSession(request!.Email.Trim(), request.Flow, challenge.Session)));
            return NoContent();
        }
        catch (CognitoEmailOtpException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPost("email-otp/verify")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthSessionResponse>> VerifyEmailOtp(
        [FromBody] EmailOtpVerifyRequest? request,
        CancellationToken cancellationToken)
    {
        var session = DecodeEmailOtpSession(cookies.ReadEmailOtpSession(Request));
        if (HasMissingEmailOtpVerifyField(request) || session is null || !MatchesSession(request!, session))
        {
            return Problem(title: "Email OTP verification is incomplete.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            var tokens = await emailOtpAuth.VerifyAsync(Normalize(request!), session.Session, cancellationToken);
            cookies.ClearEmailOtpSession(Response);
            return Ok(cookies.SignIn(Response, tokens));
        }
        catch (CognitoEmailOtpException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpGet("session")]
    [Authorize]
    public ActionResult<AuthSessionResponse> Session()
    {
        return Ok(cookies.CreateSession(User));
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        cookies.SignOut(Response);
        return NoContent();
    }

    private static bool HasMissingCallbackField(AuthCallbackRequest? request)
    {
        return request is null ||
               string.IsNullOrWhiteSpace(request.Code) ||
               string.IsNullOrWhiteSpace(request.CodeVerifier) ||
               string.IsNullOrWhiteSpace(request.RedirectUri);
    }

    private static bool HasMissingEmailOtpRequestField(EmailOtpAuthRequest? request)
    {
        return request is null ||
               string.IsNullOrWhiteSpace(request.Email) ||
               !IsSupportedEmailOtpFlow(request.Flow);
    }

    private static bool HasMissingEmailOtpVerifyField(EmailOtpVerifyRequest? request)
    {
        return request is null ||
               string.IsNullOrWhiteSpace(request.Email) ||
               string.IsNullOrWhiteSpace(request.Otp) ||
               !IsSupportedEmailOtpFlow(request.Flow);
    }

    private static bool IsSupportedEmailOtpFlow(string? flow)
    {
        return flow is "sign-in" or "sign-up";
    }

    private static EmailOtpAuthRequest Normalize(EmailOtpAuthRequest request)
    {
        return request with { Email = request.Email.Trim().ToLowerInvariant() };
    }

    private static EmailOtpVerifyRequest Normalize(EmailOtpVerifyRequest request)
    {
        return request with { Email = request.Email.Trim().ToLowerInvariant(), Otp = request.Otp.Trim() };
    }

    private static bool MatchesSession(EmailOtpVerifyRequest request, EmailOtpSession session)
    {
        return string.Equals(request.Email.Trim(), session.Email, StringComparison.OrdinalIgnoreCase) &&
               string.Equals(request.Flow, session.Flow, StringComparison.Ordinal);
    }

    private static string EncodeEmailOtpSession(EmailOtpSession session)
    {
        return Convert.ToBase64String(System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(session))
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    private static EmailOtpSession? DecodeEmailOtpSession(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        try
        {
            var normalized = value.Replace('-', '+').Replace('_', '/');
            var padded = normalized.PadRight(normalized.Length + ((4 - normalized.Length % 4) % 4), '=');
            return System.Text.Json.JsonSerializer.Deserialize<EmailOtpSession>(Convert.FromBase64String(padded));
        }
        catch (FormatException)
        {
            return null;
        }
        catch (System.Text.Json.JsonException)
        {
            return null;
        }
    }

    private sealed record EmailOtpSession(string Email, string Flow, string Session);
}
