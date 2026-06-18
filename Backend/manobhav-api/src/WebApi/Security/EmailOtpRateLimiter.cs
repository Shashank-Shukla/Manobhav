using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Security;

public interface IEmailOtpRateLimiter
{
    Task<EmailOtpRateLimitReservation> ReserveAsync(
        string email,
        string flow,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task ReleaseAsync(
        EmailOtpRateLimitReservation reservation,
        DateTimeOffset now,
        CancellationToken cancellationToken);
}

public sealed record EmailOtpRateLimitReservation(
    DateTimeOffset ResendAvailableAtUtc,
    int RetryAfterSeconds,
    int SendsRemainingThisHour)
{
    public Guid? BucketId { get; init; }
    public int? ReservedVersion { get; init; }
    public DateTimeOffset? ReservedAtUtc { get; init; }
    public DateTimeOffset? PreviousWindowStartedAtUtc { get; init; }
    public int? PreviousWindowSendCount { get; init; }
    public DateTimeOffset? PreviousLastReservedAtUtc { get; init; }
}

public sealed class EmailOtpRateLimiter(
    ApplicationDbContext db,
    ILogger<EmailOtpRateLimiter> logger) : IEmailOtpRateLimiter
{
    private const int MaxSendsPerHour = 3;
    private const int MaxAttempts = 5;
    private static readonly TimeSpan MinimumSendInterval = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan SendWindow = TimeSpan.FromHours(1);

    public async Task<EmailOtpRateLimitReservation> ReserveAsync(
        string email,
        string flow,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        for (var attempt = 1; attempt <= MaxAttempts; attempt += 1)
        {
            DetachTrackedBucket(normalizedEmail, flow);
            var bucket = await db.EmailOtpRateLimitBuckets
                .SingleOrDefaultAsync(item => item.Email == normalizedEmail && item.Flow == flow, cancellationToken);

            if (bucket is null)
            {
                var created = CreateBucket(normalizedEmail, flow, now);
                db.EmailOtpRateLimitBuckets.Add(created);
                try
                {
                    await db.SaveChangesAsync(cancellationToken);
                    return CreateReservation(created, now, previousWindowStartedAtUtc: null, previousWindowSendCount: null, previousLastReservedAtUtc: null);
                }
                catch (DbUpdateException exception) when (IsUniqueConstraintViolation(exception))
                {
                    logger.LogDebug(exception, "Email OTP rate-limit bucket insert raced for {Email} {Flow}.", normalizedEmail, flow);
                    DetachEntry(created);
                    continue;
                }
            }

            ApplyWindowResetIfNeeded(bucket, now);
            ThrowIfLimited(bucket, now);
            var previousWindowStartedAtUtc = bucket.WindowStartedAtUtc;
            var previousWindowSendCount = bucket.WindowSendCount;
            var previousLastReservedAtUtc = bucket.LastReservedAtUtc;
            bucket.WindowSendCount += 1;
            bucket.LastReservedAtUtc = now;
            bucket.UpdatedAtUtc = now;
            bucket.Version += 1;

            try
            {
                await db.SaveChangesAsync(cancellationToken);
                return CreateReservation(bucket, now, previousWindowStartedAtUtc, previousWindowSendCount, previousLastReservedAtUtc);
            }
            catch (DbUpdateConcurrencyException exception)
            {
                logger.LogDebug(exception, "Email OTP rate-limit bucket update raced for {Email} {Flow}.", normalizedEmail, flow);
                foreach (var entry in exception.Entries)
                {
                    entry.State = EntityState.Detached;
                }
            }
        }

        throw new InvalidOperationException("Could not reserve an email OTP rate-limit bucket after concurrent updates.");
    }

    public async Task ReleaseAsync(
        EmailOtpRateLimitReservation reservation,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (reservation.BucketId is null ||
            reservation.ReservedVersion is null ||
            reservation.ReservedAtUtc is null)
        {
            return;
        }

        var bucket = await db.EmailOtpRateLimitBuckets
            .SingleOrDefaultAsync(item => item.Id == reservation.BucketId.Value, cancellationToken);
        if (bucket is null ||
            bucket.Version != reservation.ReservedVersion.Value ||
            bucket.LastReservedAtUtc != reservation.ReservedAtUtc.Value)
        {
            return;
        }

        if (reservation.PreviousWindowSendCount is null ||
            reservation.PreviousWindowStartedAtUtc is null ||
            reservation.PreviousLastReservedAtUtc is null)
        {
            db.EmailOtpRateLimitBuckets.Remove(bucket);
        }
        else
        {
            bucket.WindowStartedAtUtc = reservation.PreviousWindowStartedAtUtc.Value;
            bucket.WindowSendCount = reservation.PreviousWindowSendCount.Value;
            bucket.LastReservedAtUtc = reservation.PreviousLastReservedAtUtc.Value;
            bucket.UpdatedAtUtc = now;
            bucket.Version += 1;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static EmailOtpRateLimitBucket CreateBucket(string email, string flow, DateTimeOffset now)
    {
        return new EmailOtpRateLimitBucket
        {
            Email = email,
            Flow = flow,
            WindowStartedAtUtc = now,
            WindowSendCount = 1,
            LastReservedAtUtc = now,
            Version = 1,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    private static void ApplyWindowResetIfNeeded(EmailOtpRateLimitBucket bucket, DateTimeOffset now)
    {
        if (bucket.WindowStartedAtUtc.Add(SendWindow) > now)
        {
            return;
        }

        bucket.WindowStartedAtUtc = now;
        bucket.WindowSendCount = 0;
    }

    private static void ThrowIfLimited(EmailOtpRateLimitBucket bucket, DateTimeOffset now)
    {
        var retryAt = ResolveRetryAt(bucket, now);
        if (retryAt is null)
        {
            return;
        }

        throw new EmailOtpRateLimitException(
            "Too many OTP requests. Please wait before requesting another code.",
            retryAt.Value,
            CalculateRetryAfterSeconds(now, retryAt.Value),
            Math.Max(0, MaxSendsPerHour - bucket.WindowSendCount));
    }

    private static DateTimeOffset? ResolveRetryAt(EmailOtpRateLimitBucket bucket, DateTimeOffset now)
    {
        DateTimeOffset? retryAt = null;
        var minuteRetryAt = bucket.LastReservedAtUtc.Add(MinimumSendInterval);
        if (minuteRetryAt > now)
        {
            retryAt = minuteRetryAt;
        }

        if (bucket.WindowSendCount >= MaxSendsPerHour)
        {
            var hourlyRetryAt = bucket.WindowStartedAtUtc.Add(SendWindow);
            retryAt = retryAt is null || hourlyRetryAt > retryAt.Value ? hourlyRetryAt : retryAt;
        }

        return retryAt;
    }

    private static EmailOtpRateLimitReservation CreateReservation(
        EmailOtpRateLimitBucket bucket,
        DateTimeOffset now,
        DateTimeOffset? previousWindowStartedAtUtc,
        int? previousWindowSendCount,
        DateTimeOffset? previousLastReservedAtUtc)
    {
        var resendAvailableAtUtc = bucket.LastReservedAtUtc.Add(MinimumSendInterval);
        return new EmailOtpRateLimitReservation(
            resendAvailableAtUtc,
            CalculateRetryAfterSeconds(now, resendAvailableAtUtc),
            Math.Max(0, MaxSendsPerHour - bucket.WindowSendCount))
        {
            BucketId = bucket.Id,
            ReservedVersion = bucket.Version,
            ReservedAtUtc = bucket.LastReservedAtUtc,
            PreviousWindowStartedAtUtc = previousWindowStartedAtUtc,
            PreviousWindowSendCount = previousWindowSendCount,
            PreviousLastReservedAtUtc = previousLastReservedAtUtc
        };
    }

    private static int CalculateRetryAfterSeconds(DateTimeOffset now, DateTimeOffset retryAt)
    {
        return Math.Max(0, (int)Math.Ceiling((retryAt - now).TotalSeconds));
    }

    private void DetachTrackedBucket(string email, string flow)
    {
        foreach (var entry in db.ChangeTracker.Entries<EmailOtpRateLimitBucket>()
                     .Where(entry => entry.Entity.Email == email && entry.Entity.Flow == flow)
                     .ToList())
        {
            entry.State = EntityState.Detached;
        }
    }

    private void DetachEntry(EmailOtpRateLimitBucket bucket)
    {
        var entry = db.Entry(bucket);
        if (entry is not null)
        {
            entry.State = EntityState.Detached;
        }
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        return exception.InnerException?.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) == true ||
            exception.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true;
    }
}
