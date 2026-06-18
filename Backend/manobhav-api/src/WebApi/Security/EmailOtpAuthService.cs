using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
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
    IEmailOtpSender sender,
    IOptions<AuthOptions> options,
    ISystemClock clock,
    ILogger<EmailOtpAuthService> logger,
    IEmailOtpCodeGenerator codeGenerator,
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

        if (normalized.Flow == "sign-up" && await cognito.UserExistsAsync(normalized.Email, cancellationToken))
        {
            throw new EmailOtpConflictException(DuplicateRegistrationMessage);
        }

        var reservation = await rateLimiter.ReserveAsync(normalized.Email, normalized.Flow, now, cancellationToken);

        if (normalized.Flow == "sign-in")
        {
            var saved = AddChallenge(
                normalized.Email,
                normalized.Flow,
                now,
                httpContext,
                otpHash: null,
                otpSalt: null,
                providerSession: null);

            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                await ReleaseReservationAsync(reservation, now, cancellationToken);
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
                    normalized.Flow,
                    now,
                    "cognito-sign-in-challenge-failed",
                    "failed",
                    exception.Message,
                    cancellationToken);
                throw;
            }

            return CreateResponse(saved, reservation);
        }

        var otp = codeGenerator.Generate();
        var challengeId = Guid.NewGuid();
        var otpSecret = HashOtp(otp, challengeId, normalized.Email, normalized.Flow);
        var platformChallenge = AddChallenge(
            challengeId,
            normalized.Email,
            normalized.Flow,
            now,
            httpContext,
            otpSecret.Hash,
            otpSecret.Salt,
            providerSession: null);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await ReleaseReservationAsync(reservation, now, cancellationToken);
            throw;
        }

        try
        {
            await sender.SendOtpAsync(normalized.Email, otp, cancellationToken);
            platformChallenge.ExternalSendStatus = "sent";
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            await InvalidateChallengeAsync(
                platformChallenge.Id,
                normalized.Email,
                normalized.Flow,
                now,
                "email-send-failed",
                "failed",
                exception.Message,
                cancellationToken);
            throw;
        }

        return CreateResponse(platformChallenge, reservation);
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

        if (IsUnavailableForVerification(challenge, now))
        {
            throw new EmailOtpValidationException("Email OTP verification is incomplete.");
        }
        var activeChallenge = challenge!;

        if (normalized.Flow == "sign-in")
        {
            if (string.IsNullOrWhiteSpace(activeChallenge.ProviderSession))
            {
                throw new EmailOtpValidationException("Email OTP verification is incomplete.");
            }

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

        var maxFailedAttempts = ResolveMaxFailedAttempts();
        if (activeChallenge.FailedAttempts >= maxFailedAttempts)
        {
            throw new EmailOtpValidationException("Email OTP verification is incomplete.");
        }

        if (!IsValidPlatformOtp(activeChallenge, normalized.Otp))
        {
            await IncrementFailedAttemptsAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, now, maxFailedAttempts, cancellationToken);
            throw new EmailOtpValidationException("Unable to verify OTP. Please try again.");
        }

        if (await cognito.UserExistsAsync(normalized.Email, cancellationToken))
        {
            throw new EmailOtpConflictException(DuplicateRegistrationMessage);
        }

        var signInReservation = await rateLimiter.ReserveAsync(normalized.Email, "sign-in", now, cancellationToken);
        var signUpLockToken = await TryLockChallengeAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, now, cancellationToken);
        if (signUpLockToken is null)
        {
            await ReleaseReservationAsync(signInReservation, now, cancellationToken);
            throw new EmailOtpValidationException("Email OTP verification is incomplete.");
        }

        Domain.Entities.EmailOtpChallenge? savedSignInChallenge = null;
        var userCreated = false;
        var signInSideEffectAttempted = false;
        try
        {
            if (await cognito.UserExistsAsync(normalized.Email, cancellationToken))
            {
                await ReleaseReservationAsync(signInReservation, now, cancellationToken);
                await ClearChallengeLockAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, signUpLockToken, cancellationToken);
                throw new EmailOtpConflictException(DuplicateRegistrationMessage);
            }

            savedSignInChallenge = AddChallenge(
                normalized.Email,
                "sign-in",
                now,
                httpContext,
                otpHash: null,
                otpSalt: null,
                providerSession: null);

            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                await ReleaseReservationAsync(signInReservation, now, cancellationToken);
                await ClearChallengeLockAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, signUpLockToken, cancellationToken);
                throw;
            }

            await cognito.CreatePasswordlessUserAsync(normalized.Email, cancellationToken);
            userCreated = true;

            signInSideEffectAttempted = true;
            var signInChallenge = await cognito.RequestSignInOtpAsync(normalized.Email, cancellationToken);
            savedSignInChallenge.ProviderSession = signInChallenge.Session;
            savedSignInChallenge.ExternalSendStatus = "sent";

            await db.SaveChangesAsync(cancellationToken);
            if (!await MarkChallengeVerifiedAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, signUpLockToken, now, cancellationToken))
            {
                await InvalidateChallengeAsync(
                    savedSignInChallenge.Id,
                    normalized.Email,
                    "sign-in",
                    now,
                    "sign-up-mark-verified-failed",
                    "failed",
                    "Email OTP verification is incomplete.",
                    cancellationToken);
                await DeleteCreatedCognitoUserAsync(normalized.Email, cancellationToken);
                throw new EmailOtpValidationException("Email OTP verification is incomplete.");
            }

            logger.LogInformation("Verified sign-up OTP and created Cognito user for {Email}.", normalized.Email);

            return new EmailOtpVerifyResult(
                "sign-in-otp-required",
                null,
                CreateResponse(savedSignInChallenge, signInReservation),
                "Account created. Enter the sign-in code we just sent.");
        }
        catch (CognitoEmailOtpException exception) when (IsDuplicateCognitoUser(exception))
        {
            if (savedSignInChallenge is not null)
            {
                await InvalidateChallengeAsync(
                    savedSignInChallenge.Id,
                    normalized.Email,
                    "sign-in",
                    now,
                    "cognito-duplicate-user",
                    "failed",
                    exception.Message,
                    cancellationToken);
            }

            await ReleaseReservationAsync(signInReservation, now, cancellationToken);
            await ClearChallengeLockAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, signUpLockToken, cancellationToken);
            throw new EmailOtpConflictException(DuplicateRegistrationMessage);
        }
        catch (EmailOtpValidationException)
        {
            throw;
        }
        catch (Exception exception)
        {
            if (savedSignInChallenge is not null)
            {
                await InvalidateChallengeAsync(
                    savedSignInChallenge.Id,
                    normalized.Email,
                    "sign-in",
                    now,
                    userCreated ? "cognito-sign-in-challenge-failed" : "cognito-user-create-failed",
                    "failed",
                    exception.Message,
                    cancellationToken);
            }

            if (userCreated)
            {
                await DeleteCreatedCognitoUserAsync(normalized.Email, cancellationToken);
            }

            if (!signInSideEffectAttempted)
            {
                await ReleaseReservationAsync(signInReservation, now, cancellationToken);
            }

            await ClearChallengeLockAsync(normalized.ChallengeId, normalized.Email, normalized.Flow, signUpLockToken, cancellationToken);
            throw;
        }
    }

    private Domain.Entities.EmailOtpChallenge AddChallenge(
        string email,
        string flow,
        DateTimeOffset now,
        HttpContext httpContext,
        string? otpHash,
        string? otpSalt,
        string? providerSession)
    {
        return AddChallenge(Guid.NewGuid(), email, flow, now, httpContext, otpHash, otpSalt, providerSession);
    }

    private Domain.Entities.EmailOtpChallenge AddChallenge(
        Guid challengeId,
        string email,
        string flow,
        DateTimeOffset now,
        HttpContext httpContext,
        string? otpHash,
        string? otpSalt,
        string? providerSession)
    {
        var challenge = new Domain.Entities.EmailOtpChallenge
        {
            Id = challengeId,
            Email = email,
            Flow = flow,
            OtpHash = otpHash,
            OtpSalt = otpSalt,
            ProviderSession = providerSession,
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

    private Task IncrementFailedAttemptsAsync(
        Guid challengeId,
        string email,
        string flow,
        DateTimeOffset now,
        int maxFailedAttempts,
        CancellationToken cancellationToken)
    {
        return db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "EmailOtpChallenges"
            SET "FailedAttempts" = "FailedAttempts" + 1
            WHERE "Id" = {challengeId}
              AND "Email" = {email}
              AND "Flow" = {flow}
              AND "VerifiedAtUtc" IS NULL
              AND "InvalidatedAtUtc" IS NULL
              AND "ExpiresAtUtc" > {now}
              AND ("VerificationLockedUntilUtc" IS NULL OR "VerificationLockedUntilUtc" <= {now})
              AND "FailedAttempts" < {maxFailedAttempts}
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

    private (string Hash, string Salt) HashOtp(string otp, Guid challengeId, string email, string flow)
    {
        var saltBytes = RandomNumberGenerator.GetBytes(16);
        var salt = Convert.ToBase64String(saltBytes);
        return (HashOtp(otp, challengeId, email, flow, salt), salt);
    }

    private string HashOtp(string otp, Guid challengeId, string email, string flow, string salt)
    {
        var secret = ResolveEmailOtpHmacSecret();
        var message = $"{challengeId:N}:{email}:{flow}:{salt}:{otp}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(message)));
    }

    private bool IsValidPlatformOtp(Domain.Entities.EmailOtpChallenge challenge, string otp)
    {
        if (string.IsNullOrWhiteSpace(challenge.OtpHash) || string.IsNullOrWhiteSpace(challenge.OtpSalt))
        {
            return false;
        }

        var expected = Convert.FromBase64String(challenge.OtpHash);
        var actual = Convert.FromBase64String(HashOtp(otp, challenge.Id, challenge.Email, challenge.Flow, challenge.OtpSalt));
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    private string ResolveEmailOtpHmacSecret()
    {
        if (string.IsNullOrWhiteSpace(options.Value.EmailOtpHmacSecret))
        {
            throw new InvalidOperationException("Auth:EmailOtpHmacSecret must be configured before email OTP authentication is enabled.");
        }

        return options.Value.EmailOtpHmacSecret;
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
