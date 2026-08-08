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
    ILogger<AuthController> logger,
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
        CancellationToken cancellationToken = default)
    {
        if (HasMissingCallbackField(request))
        {
            return Problem(title: "Auth callback request is incomplete.", statusCode: StatusCodes.Status400BadRequest);
        }

        CognitoTokenSet tokens;
        try
        {
            tokens = await tokenExchange.ExchangeCodeAsync(request!, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Cognito token exchange failed during auth callback.");
            return CallbackStageFailure("token_exchange", exception);
        }

        var session = cookies.SignIn(Response, tokens);

        try
        {
            await SyncUserFromIdTokenAsync(tokens.IdToken, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Syncing the signed-in user into the database failed during auth callback.");
            return CallbackStageFailure("user_sync", exception);
        }

        try
        {
            session = await BuildEnrichedSessionAsync(session, AuthCookieManager.ReadSubjectFromAccessToken(tokens.AccessToken), cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Building the enriched session failed during auth callback.");
            return CallbackStageFailure("session_enrichment", exception);
        }

        return Ok(session);
    }

    /// <summary>
    /// Reports which auth-callback stage failed without leaking exception details to the client —
    /// the exception type name is safe (e.g. "InvalidOperationException", "DbUpdateException") and
    /// lets the caller distinguish an upstream Cognito rejection from a local DB/config failure
    /// straight from the browser's network tab, without needing server log access.
    /// </summary>
    private ActionResult<AuthSessionResponse> CallbackStageFailure(string stage, Exception exception)
    {
        return ProblemWithExtensions(
            "We couldn't complete sign in. Please try again.",
            StatusCodes.Status500InternalServerError,
            new Dictionary<string, object?>
            {
                ["stage"] = stage,
                ["exceptionType"] = exception.GetType().Name
            });
    }

    [HttpPost("email-otp/request")]
    [AllowAnonymous]
    public async Task<IActionResult> RequestEmailOtp(
        [FromBody] EmailOtpAuthRequest? request,
        CancellationToken cancellationToken = default)
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
        CancellationToken cancellationToken = default)
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
                await SyncUserFromIdTokenAsync(result.Tokens.IdToken, cancellationToken);
                session = await BuildEnrichedSessionAsync(
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
        session = await BuildEnrichedSessionAsync(session, User.FindFirst("sub")?.Value, cancellationToken);
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
    /// Mirrors the just-signed-in Cognito account into the database from the ID token (which carries
    /// email and name, unlike the access token). This keeps the <c>Users</c> table — the source for
    /// the admin patient roster and the dashboard avatar — populated for every account, not only
    /// those that later book or onboard.
    /// </summary>
    private async Task SyncUserFromIdTokenAsync(string? idToken, CancellationToken cancellationToken = default)
    {
        if (db is null)
        {
            return;
        }

        var (subject, email, name) = AuthCookieManager.ReadProfileFromIdToken(idToken);
        if (string.IsNullOrWhiteSpace(subject))
        {
            return;
        }

        var user = await db.Users.FirstOrDefaultAsync(item => item.CognitoSubject == subject, cancellationToken);
        if (user is null)
        {
            user = new Domain.Entities.User { CognitoSubject = subject, Email = email, DisplayName = name };
            await db.Users.AddAsync(user, cancellationToken);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(user.Email) && !string.IsNullOrWhiteSpace(email))
            {
                user.Email = email;
            }

            if (string.IsNullOrWhiteSpace(user.DisplayName) && !string.IsNullOrWhiteSpace(name))
            {
                user.DisplayName = name;
            }

            user.LastLoginAtUtc = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Resolves the database user for the session, ensures a row exists (so even accounts that have
    /// never acted appear in admin rosters), and returns the session augmented with the user's
    /// database roles and profile. Provider classification lives in the <c>UserRole</c> table while
    /// Cognito only carries groups such as "Admin"; the frontend role router reads
    /// <see cref="AuthSessionResponse.Groups"/>, so active database roles are merged in here. These
    /// groups drive UI routing only — backend authorization still relies on the Cognito
    /// "cognito:groups" claim — so this cannot grant elevated access.
    /// </summary>
    private async Task<AuthSessionResponse> BuildEnrichedSessionAsync(
        AuthSessionResponse session,
        string? cognitoSubject,
        CancellationToken cancellationToken = default)
    {
        if (db is null || string.IsNullOrWhiteSpace(cognitoSubject))
        {
            return session;
        }

        var user = await db.Users.FirstOrDefaultAsync(item => item.CognitoSubject == cognitoSubject, cancellationToken);
        if (user is null)
        {
            user = new Domain.Entities.User { CognitoSubject = cognitoSubject };
            await db.Users.AddAsync(user, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }

        var roles = await db.UserRoles
            .AsNoTracking()
            .Where(role => role.UserId == user.Id && role.IsActive)
            .Select(role => role.Role)
            .ToListAsync(cancellationToken);

        var groups = session.Groups
            .Concat(roles)
            .Where(group => !string.IsNullOrWhiteSpace(group))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return session with
        {
            Groups = groups,
            Email = user.Email,
            Name = FirstNonEmpty(user.DisplayName, user.Name),
        };
    }

    private static string? FirstNonEmpty(params string?[] candidates)
    {
        return candidates.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
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
