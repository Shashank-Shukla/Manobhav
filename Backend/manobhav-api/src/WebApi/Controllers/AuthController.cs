using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApi.Security;

namespace WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    ICognitoTokenExchange tokenExchange,
    AuthCookieManager cookies,
    IEmailOtpAuthService emailOtpAuth,
    ApplicationDbContext? db = null) : ControllerBase
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
        var session = cookies.SignIn(Response, tokens);
        session = await EnrichWithDatabaseRolesAsync(session, AuthCookieManager.ReadSubjectFromAccessToken(tokens.AccessToken), cancellationToken);
        return Ok(session);
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
            return Ok(await emailOtpAuth.RequestAsync(Normalize(request!), HttpContext, cancellationToken));
        }
        catch (EmailOtpConflictException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status409Conflict);
        }
        catch (EmailOtpRateLimitException exception)
        {
            Response.Headers.RetryAfter = exception.RetryAfterSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
            return ProblemWithExtensions(
                exception.Message,
                StatusCodes.Status429TooManyRequests,
                new Dictionary<string, object?>
                {
                    ["resendAvailableAtUtc"] = exception.ResendAvailableAtUtc,
                    ["retryAfterSeconds"] = exception.RetryAfterSeconds,
                    ["sendsRemainingThisHour"] = exception.SendsRemainingThisHour
                });
        }
        catch (CognitoEmailOtpException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPost("email-otp/verify")]
    [AllowAnonymous]
    public async Task<ActionResult<EmailOtpVerifyResponse>> VerifyEmailOtp(
        [FromBody] EmailOtpVerifyRequest? request,
        CancellationToken cancellationToken)
    {
        if (HasMissingEmailOtpVerifyField(request))
        {
            return Problem(title: "Email OTP verification is incomplete.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            var result = await emailOtpAuth.VerifyAsync(Normalize(request!), HttpContext, cancellationToken);
            var session = result.Tokens is null ? null : cookies.SignIn(Response, result.Tokens);
            if (session is not null && result.Tokens is not null)
            {
                session = await EnrichWithDatabaseRolesAsync(
                    session,
                    AuthCookieManager.ReadSubjectFromAccessToken(result.Tokens.AccessToken),
                    cancellationToken);
            }

            return Ok(new EmailOtpVerifyResponse(result.Status, session, result.Challenge, result.Message));
        }
        catch (EmailOtpConflictException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status409Conflict);
        }
        catch (EmailOtpValidationException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (EmailOtpRateLimitException exception)
        {
            Response.Headers.RetryAfter = exception.RetryAfterSeconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
            return ProblemWithExtensions(
                exception.Message,
                StatusCodes.Status429TooManyRequests,
                new Dictionary<string, object?>
                {
                    ["resendAvailableAtUtc"] = exception.ResendAvailableAtUtc,
                    ["retryAfterSeconds"] = exception.RetryAfterSeconds,
                    ["sendsRemainingThisHour"] = exception.SendsRemainingThisHour
                });
        }
        catch (CognitoEmailOtpException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpGet("session")]
    [Authorize]
    public async Task<ActionResult<AuthSessionResponse>> Session(CancellationToken cancellationToken = default)
    {
        var session = cookies.CreateSession(User);
        session = await EnrichWithDatabaseRolesAsync(session, User.FindFirst("sub")?.Value, cancellationToken);
        return Ok(session);
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        cookies.SignOut(Response);
        return NoContent();
    }

    /// <summary>
    /// Provider classification lives in the database <c>UserRole</c> table (e.g. "Provider",
    /// "ProviderApplicant"), while Cognito only carries groups such as "Admin". The frontend role
    /// router decides which dashboard to show from <see cref="AuthSessionResponse.Groups"/>, so we
    /// merge the user's active database roles into the session groups here. These groups are used by
    /// the client for UI routing only — backend authorization continues to rely on the Cognito
    /// "cognito:groups" claim — so this cannot grant elevated access.
    /// </summary>
    private async Task<AuthSessionResponse> EnrichWithDatabaseRolesAsync(
        AuthSessionResponse session,
        string? cognitoSubject,
        CancellationToken cancellationToken)
    {
        if (db is null || string.IsNullOrWhiteSpace(cognitoSubject))
        {
            return session;
        }

        var userId = await db.Users
            .AsNoTracking()
            .Where(user => user.CognitoSubject == cognitoSubject)
            .Select(user => (Guid?)user.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (userId is null)
        {
            return session;
        }

        var roles = await db.UserRoles
            .AsNoTracking()
            .Where(role => role.UserId == userId && role.IsActive)
            .Select(role => role.Role)
            .ToListAsync(cancellationToken);
        if (roles.Count == 0)
        {
            return session;
        }

        var groups = session.Groups
            .Concat(roles)
            .Where(group => !string.IsNullOrWhiteSpace(group))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        return session with { Groups = groups };
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
               request.ChallengeId == Guid.Empty ||
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

    private ObjectResult ProblemWithExtensions(string title, int statusCode, IReadOnlyDictionary<string, object?> extensions)
    {
        var details = new ProblemDetails
        {
            Title = title,
            Status = statusCode
        };
        foreach (var extension in extensions)
        {
            details.Extensions[extension.Key] = extension.Value;
        }

        return new ObjectResult(details) { StatusCode = statusCode };
    }
}
