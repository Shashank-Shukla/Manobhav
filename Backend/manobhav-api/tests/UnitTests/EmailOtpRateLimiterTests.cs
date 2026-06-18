using Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using WebApi.Security;

namespace UnitTests;

public sealed class EmailOtpRateLimiterTests
{
    private static readonly DateTimeOffset FixedNow = DateTimeOffset.Parse("2026-06-19T10:00:00Z");

    [Fact]
    public async Task ConcurrentFirstReservations_AllowsOnlyOneWithinMinute()
    {
        await using var database = await SqliteRateLimitDatabase.CreateAsync();
        using var barrier = new Barrier(2);

        var attempts = Enumerable.Range(0, 2)
            .Select(_ => Task.Run(async () =>
            {
                await using var db = database.CreateDbContext();
                var limiter = CreateLimiter(db);
                barrier.SignalAndWait();

                try
                {
                    await limiter.ReserveAsync("person@example.com", "sign-up", FixedNow, CancellationToken.None);
                    return "allowed";
                }
                catch (EmailOtpRateLimitException)
                {
                    return "limited";
                }
            }))
            .ToArray();

        var results = await Task.WhenAll(attempts);

        Assert.Equal(1, results.Count(result => result == "allowed"));
        Assert.Equal(1, results.Count(result => result == "limited"));
        await using var verificationDb = database.CreateDbContext();
        var bucket = Assert.Single(verificationDb.EmailOtpRateLimitBuckets);
        Assert.Equal(1, bucket.WindowSendCount);
    }

    [Fact]
    public async Task FourthReservationWithinHour_IsRejected()
    {
        await using var database = await SqliteRateLimitDatabase.CreateAsync();
        await using var db = database.CreateDbContext();
        var limiter = CreateLimiter(db);

        for (var i = 0; i < 3; i += 1)
        {
            var reservation = await limiter.ReserveAsync("person@example.com", "sign-up", FixedNow.AddMinutes(i), CancellationToken.None);
            Assert.Equal(Math.Max(0, 2 - i), reservation.SendsRemainingThisHour);
        }

        var exception = await Assert.ThrowsAsync<EmailOtpRateLimitException>(() =>
            limiter.ReserveAsync("person@example.com", "sign-up", FixedNow.AddMinutes(3), CancellationToken.None));

        Assert.Equal(FixedNow.AddHours(1), exception.ResendAvailableAtUtc);
        Assert.Equal(3420, exception.RetryAfterSeconds);
        Assert.Equal(0, exception.SendsRemainingThisHour);
    }

    private static EmailOtpRateLimiter CreateLimiter(ApplicationDbContext db)
    {
        return new EmailOtpRateLimiter(db, NullLogger<EmailOtpRateLimiter>.Instance);
    }

    private sealed class SqliteRateLimitDatabase : IAsyncDisposable
    {
        private readonly string _databasePath;
        private readonly DbContextOptions<ApplicationDbContext> _options;

        private SqliteRateLimitDatabase(string databasePath, DbContextOptions<ApplicationDbContext> options)
        {
            _databasePath = databasePath;
            _options = options;
        }

        public static async Task<SqliteRateLimitDatabase> CreateAsync()
        {
            var databasePath = Path.Combine(Path.GetTempPath(), $"manobhav-otp-rate-limit-{Guid.NewGuid():N}.db");
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite($"Data Source={databasePath};Cache=Shared;Default Timeout=30;Pooling=False")
                .Options;
            await using var db = new ApplicationDbContext(options);
            await db.Database.EnsureCreatedAsync();
            return new SqliteRateLimitDatabase(databasePath, options);
        }

        public ApplicationDbContext CreateDbContext()
        {
            return new ApplicationDbContext(_options);
        }

        public async ValueTask DisposeAsync()
        {
            await Task.CompletedTask;
            SqliteConnection.ClearAllPools();
            if (File.Exists(_databasePath))
            {
                File.Delete(_databasePath);
            }
        }
    }
}
