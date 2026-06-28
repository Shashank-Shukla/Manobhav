using System.Net.Mail;
using System.Security.Cryptography;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebApi.Notifications;

namespace WebApi.Security;

public interface ISystemClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : ISystemClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

public interface IEmailOtpSender
{
    Task SendOtpAsync(string email, string otp, CancellationToken cancellationToken);
}

public interface IEmailOtpCodeGenerator
{
    string Generate();
}

public sealed class EmailOtpCodeGenerator : IEmailOtpCodeGenerator
{
    public string Generate()
    {
        return RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
    }
}

public interface IEmailOtpAuthService
{
    Task<EmailOtpAuthResponse> RequestAsync(EmailOtpAuthRequest request, HttpContext httpContext, CancellationToken cancellationToken);

    Task<EmailOtpVerifyResult> VerifyAsync(EmailOtpVerifyRequest request, HttpContext httpContext, CancellationToken cancellationToken);
}

public sealed record EmailOtpVerifyResult(
    string Status,
    CognitoTokenSet? Tokens,
    EmailOtpAuthResponse? Challenge,
    string? Message);

public sealed class SesEmailOtpSender(
    ISesEmailClient sesClient,
    IOptions<AuthOptions> options,
    ILogger<SesEmailOtpSender> logger) : IEmailOtpSender
{
    public async Task SendOtpAsync(string email, string otp, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.OtpEmailFromAddress))
        {
            throw new InvalidOperationException("Auth:OtpEmailFromAddress must be configured before email OTP sign-up is enabled.");
        }

        var message = new SesEmail(
            FormatFromAddress(settings),
            [email],
            settings.OtpEmailSubject,
            BuildBody(otp));

        await sesClient.SendEmailAsync(message, cancellationToken);
        logger.LogInformation("Sent email OTP to {Email}.", email);
    }

    private static string BuildBody(string otp)
    {
        return $"Your Manobhav verification code is {otp}. It expires in 10 minutes.";
    }

    private static string FormatFromAddress(AuthOptions settings)
    {
        return string.IsNullOrWhiteSpace(settings.OtpEmailFromDisplayName)
            ? settings.OtpEmailFromAddress
            : new MailAddress(settings.OtpEmailFromAddress, settings.OtpEmailFromDisplayName).ToString();
    }
}

public sealed class EmailOtpAuthService(
    ApplicationDbContext db,
    ICognitoEmailOtpAuth cognito,
    IOptions<AuthOptions> options,
    ISystemClock clock,
    ILogger<EmailOtpAuthService> logger,
    IEmailOtpRateLimiter rateLimiter) : IEmailOtpAuthService
{
    public const string DuplicateRegistrationMessage = "We believe you've already registered with us, you might want to try Signing in.";

    public async Task<EmailOtpAuthResponse> RequestAsync(
        EmailOtpAuthRequest request,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        var normalized = Normalize(request);
        var now = clock.UtcNow;

        // The API owns the sign-in vs sign-up decision: a known email signs in, an unknown email
        // registers. The client's requested flow is only a hint, so a registered user landing on
        // "sign up" (or a brand-new user on "sign in") is routed correctly in a single request
        // instead of dead-ending on a 409. The chosen flow is stored on the challenge and echoed
        // back so verification matches it.
        var flow = await cognito.UserExistsAsync(normalized.Email, cancellationToken) ? "sign-in" : "sign-up";

        var reservation = await rateLimiter.ReserveAsync(normalized.Email, flow, now, cancellationToken);

        var userCreated = false;
        if (flow == "sign-up")
        {
            try
            {
                await cognito.CreatePasswordlessUserAsync(normalized.Email, cancellationToken);
                userCreated = true;
            }
            catch (CognitoEmailOtpException exception) when (IsDuplicateCognitoUser(exception))
            {
                // Raced with another registration between the existence check and create: the account
                // now exists, so fall back to signing the user in rather than failing.
                flow = "sign-in";
            }
            catch
            {
                await ReleaseReservationAsync(reservation, now, cancellationToken);
                throw;
            }
        }

        var saved = AddChallenge(normalized.Email, flow, now, httpContext);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await ReleaseReservationAsync(reservation, now, cancellationToken);
            if (userCreated)
            {
                await DeleteCreatedCognitoUserAsync(normalized.Email, cancellationToken);
            }

            throw;
        }

        try
        {
            var challenge = await cognito.RequestSignInOtpAsync(normalized.Email, cancellationToken);
            saved.ProviderSession = challenge.Session;
            saved.ExternalSendStatus = "sent";
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            await InvalidateChallengeAsync(
                saved.Id,
                normalized.Email,
                flow,
                now,
                "cognito-challenge-failed",
                "failed",
                exception.Message,
                cancellationToken);
            if (userCreated)
            {
                await DeleteCreatedCognitoUserAsync(normalized.Email, cancellationToken);
            }

            throw;
        }

        return CreateResponse(saved, reservation);
    }

    public async Task<EmailOtpVerifyResult> VerifyAsync(
        EmailOtpVerifyRequest request,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        var normalized = Normalize(request);
        var now = clock.UtcNow;
        var challenge = await db.EmailOtpChallenges
            .SingleOrDefaultAsync(item =>
                item.Id == normalized.ChallengeId &&
                item.Email == normalized.Email &&
                item.Flow == normalized.Flow,
                cancellationToken);

        if (IsUnavailableForVerification(challenge, now) || string.IsNullOrWhiteSpace(challenge!.ProviderSession))
        {
            throw new EmailOtpValidationException("Email OTP verification is incomplete.");
        }
        var activeChallenge = challenge;

        var lockToken = await TryLockChallengeAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, now, cancellationToken);
        if (lockToken is null)
        {
            throw new EmailOtpValidationException("Email OTP verification is incomplete.");
        }

        CognitoTokenSet tokens;
        try
        {
            tokens = await cognito.VerifySignInOtpAsync(
                normalized.Email,
                normalized.Otp,
                activeChallenge.ProviderSession,
                cancellationToken);
        }
        catch
        {
            await ClearChallengeLockAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, lockToken, cancellationToken);
            throw;
        }

        if (!await MarkChallengeVerifiedAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, lockToken, now, cancellationToken))
        {
            throw new EmailOtpValidationException("Email OTP verification is incomplete.");
        }

        return new EmailOtpVerifyResult("authenticated", tokens, null, null);
    }

    private Domain.Entities.EmailOtpChallenge AddChallenge(
        string email,
        string flow,
        DateTimeOffset now,
        HttpContext httpContext)
    {
        var challenge = new Domain.Entities.EmailOtpChallenge
        {
            Id = Guid.NewGuid(),
            Email = email,
            Flow = flow,
            OtpHash = null,
            OtpSalt = null,
            ProviderSession = null,
            ExternalSendStatus = "pending",
            CreatedAtUtc = now,
            LastSentAtUtc = now,
            ExpiresAtUtc = now.AddMinutes(Math.Max(1, options.Value.EmailOtpExpiryMinutes)),
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString()
        };
        db.EmailOtpChallenges.Add(challenge);
        return challenge;
    }

    private static EmailOtpAuthResponse CreateResponse(Domain.Entities.EmailOtpChallenge challenge, EmailOtpRateLimitReservation reservation)
    {
        return new EmailOtpAuthResponse(
            challenge.Id,
            challenge.Email,
            challenge.Flow,
            challenge.ExpiresAtUtc,
            reservation.ResendAvailableAtUtc,
            reservation.RetryAfterSeconds,
            reservation.SendsRemainingThisHour);
    }

    private bool IsUnavailableForVerification(Domain.Entities.EmailOtpChallenge? challenge, DateTimeOffset now)
    {
        return challenge is null ||
            challenge.VerifiedAtUtc is not null ||
            challenge.InvalidatedAtUtc is not null ||
            challenge.ExpiresAtUtc <= now ||
            challenge.VerificationLockedUntilUtc > now;
    }

    private async Task<string?> TryLockChallengeAsync(
        Guid challengeId,
        string email,
        string flow,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var lockUntil = now.AddSeconds(Math.Max(1, options.Value.EmailOtpVerificationLockSeconds));
        var lockToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var maxFailedAttempts = ResolveMaxFailedAttempts();
        var updated = await db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "EmailOtpChallenges"
            SET "VerificationLockedUntilUtc" = {lockUntil},
                "VerificationLockToken" = {lockToken}
            WHERE "Id" = {challengeId}
              AND "Email" = {email}
              AND "Flow" = {flow}
              AND "VerifiedAtUtc" IS NULL
              AND "InvalidatedAtUtc" IS NULL
              AND "ExpiresAtUtc" > {now}
              AND ("VerificationLockedUntilUtc" IS NULL OR "VerificationLockedUntilUtc" <= {now})
              AND "FailedAttempts" < {maxFailedAttempts}
            """, cancellationToken);

        return updated == 1 ? lockToken : null;
    }

    private async Task<bool> MarkChallengeVerifiedAsync(
        Guid challengeId,
        string email,
        string flow,
        string lockToken,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var updated = await db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "EmailOtpChallenges"
            SET "VerifiedAtUtc" = {now},
                "VerificationLockedUntilUtc" = NULL,
                "VerificationLockToken" = NULL
            WHERE "Id" = {challengeId}
              AND "Email" = {email}
              AND "Flow" = {flow}
              AND "VerifiedAtUtc" IS NULL
              AND "InvalidatedAtUtc" IS NULL
              AND "VerificationLockToken" = {lockToken}
            """, cancellationToken);

        return updated == 1;
    }

    private Task ClearChallengeLockAsync(
        Guid challengeId,
        string email,
        string flow,
        string lockToken,
        CancellationToken cancellationToken)
    {
        return db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "EmailOtpChallenges"
            SET "VerificationLockedUntilUtc" = NULL,
                "VerificationLockToken" = NULL
            WHERE "Id" = {challengeId}
              AND "Email" = {email}
              AND "Flow" = {flow}
              AND "VerifiedAtUtc" IS NULL
              AND "VerificationLockToken" = {lockToken}
            """, cancellationToken);
    }

    private async Task InvalidateChallengeAsync(
        Guid challengeId,
        string email,
        string flow,
        DateTimeOffset now,
        string reason,
        string externalSendStatus,
        string? failure,
        CancellationToken cancellationToken)
    {
        var trimmedFailure = TrimToMaxLength(failure, 240);
        try
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE "EmailOtpChallenges"
                SET "InvalidatedAtUtc" = {now},
                    "InvalidationReason" = {reason},
                    "ExternalSendStatus" = {externalSendStatus},
                    "ExternalSendFailure" = {trimmedFailure}
                WHERE "Id" = {challengeId}
                  AND "Email" = {email}
                  AND "Flow" = {flow}
                  AND "VerifiedAtUtc" IS NULL
                """, cancellationToken);

            var tracked = db.EmailOtpChallenges.Local.FirstOrDefault(challenge =>
                challenge.Id == challengeId &&
                challenge.Email == email &&
                challenge.Flow == flow &&
                challenge.VerifiedAtUtc is null);
            if (tracked is not null)
            {
                tracked.InvalidatedAtUtc = now;
                tracked.InvalidationReason = reason;
                tracked.ExternalSendStatus = externalSendStatus;
                tracked.ExternalSendFailure = trimmedFailure;
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed to invalidate email OTP challenge {ChallengeId}.", challengeId);
        }
    }

    private async Task DeleteCreatedCognitoUserAsync(string email, CancellationToken cancellationToken)
    {
        try
        {
            await cognito.DeletePasswordlessUserAsync(email, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed to delete Cognito user after incomplete email OTP sign-up for {Email}.", email);
        }
    }

    private async Task ReleaseReservationAsync(
        EmailOtpRateLimitReservation reservation,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        try
        {
            await rateLimiter.ReleaseAsync(reservation, now, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed to release email OTP rate-limit reservation.");
        }
    }

    private static string? TrimToMaxLength(string? value, int maxLength)
    {
        return string.IsNullOrEmpty(value) || value.Length <= maxLength ? value : value[..maxLength];
    }

    private int ResolveMaxFailedAttempts()
    {
        return Math.Max(1, options.Value.EmailOtpMaxFailedAttempts);
    }

    private static bool IsDuplicateCognitoUser(CognitoEmailOtpException exception)
    {
        return exception.ErrorType.Contains("UsernameExistsException", StringComparison.OrdinalIgnoreCase) ||
            exception.ErrorType.Contains("AliasExistsException", StringComparison.OrdinalIgnoreCase);
    }

    private static EmailOtpAuthRequest Normalize(EmailOtpAuthRequest request)
    {
        return request with { Email = request.Email.Trim().ToLowerInvariant() };
    }

    private static EmailOtpVerifyRequest Normalize(EmailOtpVerifyRequest request)
    {
        return request with
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            Otp = request.Otp.Trim()
        };
    }
}

public sealed class EmailOtpRateLimitException(
    string message,
    DateTimeOffset resendAvailableAtUtc,
    int retryAfterSeconds,
    int sendsRemainingThisHour) : Exception(message)
{
    public DateTimeOffset ResendAvailableAtUtc { get; } = resendAvailableAtUtc;
    public int RetryAfterSeconds { get; } = retryAfterSeconds;
    public int SendsRemainingThisHour { get; } = sendsRemainingThisHour;
}

public sealed class EmailOtpConflictException(string message) : Exception(message);

public sealed class EmailOtpValidationException(string message) : Exception(message);
