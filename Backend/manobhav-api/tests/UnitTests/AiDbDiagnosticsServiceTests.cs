using System.Text.Json;
using Application.DTOs;
using Application.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace UnitTests;

public sealed class AiDbDiagnosticsServiceTests
{
    [Fact]
    public async Task GetTable_User_ReturnsRawUnmaskedColumnsIncludingCognitoSubject()
    {
        await using var db = CreateDbContext();
        db.Users.Add(new User
        {
            CognitoSubject = "secret-cognito-subject",
            Email = "john@example.com",
            Phone = "9812345678",
            Name = "John",
            DisplayName = "Dr. John",
            AccountStatus = "Active",
        });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var rows = Assert.IsType<List<IReadOnlyDictionary<string, object?>>>(
            await service.GetTableAsync("user", 50, 0, CancellationToken.None));

        var user = Assert.Single(rows);
        // No masking anymore — the agent needs the real values to verify correctness.
        Assert.Equal("john@example.com", user["Email"]);
        Assert.Equal("9812345678", user["Phone"]);
        Assert.Equal("secret-cognito-subject", user["CognitoSubject"]);
    }

    [Fact]
    public async Task GetTable_ProviderOnboardingApplication_ExposesFullSessionDetailsIncludingPayout()
    {
        await using var db = CreateDbContext();
        var user = new User { CognitoSubject = "s" };
        db.Users.Add(user);
        db.ProviderOnboardingApplications.Add(new ProviderOnboardingApplication
        {
            UserId = user.Id,
            Status = "Submitted",
            BioJson = """{ "bio": { "shortBio": "Hi" } }""",
            SessionDetailsJson = """
                {
                  "sessionDetails": { "availabilitySlots": [{ "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00" }] },
                  "payout": { "accountNumber": "123456789012", "ifscCode": "HDFC0001234" }
                }
                """,
        });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var rows = Assert.IsType<List<IReadOnlyDictionary<string, object?>>>(
            await service.GetTableAsync("provider-onboarding-application", 50, 0, CancellationToken.None));

        var application = Assert.Single(rows);
        var sessionDetails = Assert.IsType<string>(application["SessionDetailsJson"]);
        // The full raw JSON is surfaced now, payout/bank details included.
        Assert.Contains("availabilitySlots", sessionDetails);
        Assert.Contains("accountNumber", sessionDetails);
        Assert.Contains("ifscCode", sessionDetails);
    }

    [Fact]
    public async Task GetTable_EmailOtpChallenge_ExposesEveryColumnRawIncludingAuthFields()
    {
        await using var db = CreateDbContext();
        db.EmailOtpChallenges.Add(new EmailOtpChallenge
        {
            Email = "patient@example.com",
            Flow = "sign-in",
            OtpHash = "the-otp-hash",
            OtpSalt = "the-otp-salt",
            ProviderSession = "cognito-session",
            VerificationLockToken = "lock-token",
            ExternalSendStatus = "sent",
            IpAddress = "203.0.113.7",
        });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var rows = Assert.IsType<List<IReadOnlyDictionary<string, object?>>>(
            await service.GetTableAsync("email-otp-challenge", 50, 0, CancellationToken.None));

        var challenge = Assert.Single(rows);
        // Nothing is suppressed anymore — every column is returned exactly as stored, auth fields included.
        Assert.Equal("patient@example.com", challenge["Email"]);
        Assert.Equal("sign-in", challenge["Flow"]);
        Assert.Equal("203.0.113.7", challenge["IpAddress"]);
        Assert.Equal("the-otp-hash", challenge["OtpHash"]);
        Assert.Equal("the-otp-salt", challenge["OtpSalt"]);
        Assert.Equal("cognito-session", challenge["ProviderSession"]);
        Assert.Equal("lock-token", challenge["VerificationLockToken"]);
    }

    [Fact]
    public async Task GetTable_ReturnsNullForUnknownTable()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        Assert.Null(await service.GetTableAsync("not-a-real-table", 50, 0, CancellationToken.None));
        Assert.Null(await service.GetTableAsync("", 50, 0, CancellationToken.None));
    }

    [Fact]
    public async Task GetTable_ClampsPagingAndHonoursOffset()
    {
        await using var db = CreateDbContext();
        db.Users.Add(new User { CognitoSubject = "a", Email = "a@example.com" });
        db.Users.Add(new User { CognitoSubject = "b", Email = "b@example.com" });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        // limit <= 0 falls back to a sane default rather than returning nothing.
        var defaulted = Assert.IsType<List<IReadOnlyDictionary<string, object?>>>(
            await service.GetTableAsync("user", 0, 0, CancellationToken.None));
        Assert.Equal(2, defaulted.Count);

        // A single page.
        var firstPage = Assert.IsType<List<IReadOnlyDictionary<string, object?>>>(
            await service.GetTableAsync("user", 1, 0, CancellationToken.None));
        Assert.Single(firstPage);

        // Offset past the end yields an empty page (negative offset is clamped to 0).
        var pastEnd = Assert.IsType<List<IReadOnlyDictionary<string, object?>>>(
            await service.GetTableAsync("user", 50, 99, CancellationToken.None));
        Assert.Empty(pastEnd);
    }

    [Fact]
    public async Task GetSummary_ReportsCountsForEveryMappedTable()
    {
        await using var db = CreateDbContext();
        db.Users.Add(new User { CognitoSubject = "s" });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var summary = await service.GetSummaryAsync(CancellationToken.None);

        // Every table is now exposed (not a curated handful).
        Assert.Equal(service.Tables.OrderBy(table => table), summary.Select(item => item.Table).OrderBy(table => table));
        Assert.Contains(summary, item => item.Table == "user" && item.Count == 1);
        Assert.Contains(summary, item => item.Table == "email-otp-challenge");
        Assert.Contains(summary, item => item.Table == "appointment");
        Assert.True(summary.Count >= 20, $"expected the full table set, got {summary.Count}");
    }

    [Fact]
    public async Task UpdateRow_AppliesSuppliedColumnsAndReturnsUpdatedRow()
    {
        await using var db = CreateDbContext();
        var profile = NewProfile(summary: "Old summary");
        db.ProviderProfiles.Add(profile);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var values = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            """{ "Summary": "Updated summary", "IsFeatured": true }""")!;
        var result = await service.UpdateRowAsync("provider-profile", profile.Id.ToString(), values, CancellationToken.None);

        Assert.Equal(AiDbDiagnosticsWriteStatus.Success, result.Status);
        Assert.NotNull(result.Row);
        Assert.Equal("Updated summary", result.Row!["Summary"]);
        Assert.Equal(true, result.Row!["IsFeatured"]);

        var reread = await db.ProviderProfiles.FindAsync(profile.Id);
        Assert.Equal("Updated summary", reread!.Summary);
        Assert.True(reread.IsFeatured);
    }

    [Fact]
    public async Task UpdateRow_ReturnsNotFoundForMissingRow_AndUnknownTableForBadKey()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);
        var values = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>("""{ "Summary": "x" }""")!;

        var missing = await service.UpdateRowAsync("provider-profile", Guid.NewGuid().ToString(), values, CancellationToken.None);
        Assert.Equal(AiDbDiagnosticsWriteStatus.NotFound, missing.Status);

        var unknown = await service.UpdateRowAsync("not-a-real-table", Guid.NewGuid().ToString(), values, CancellationToken.None);
        Assert.Equal(AiDbDiagnosticsWriteStatus.UnknownTable, unknown.Status);

        var badKey = await service.UpdateRowAsync("provider-profile", "not-a-guid", values, CancellationToken.None);
        Assert.Equal(AiDbDiagnosticsWriteStatus.BadRequest, badKey.Status);
    }

    [Fact]
    public async Task DeleteRow_RemovesTheRow()
    {
        await using var db = CreateDbContext();
        var profile = NewProfile(summary: "Doomed");
        db.ProviderProfiles.Add(profile);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var result = await service.DeleteRowAsync("provider-profile", profile.Id.ToString(), CancellationToken.None);

        Assert.Equal(AiDbDiagnosticsWriteStatus.Success, result.Status);
        Assert.Null(await db.ProviderProfiles.FindAsync(profile.Id));

        var missingAgain = await service.DeleteRowAsync("provider-profile", profile.Id.ToString(), CancellationToken.None);
        Assert.Equal(AiDbDiagnosticsWriteStatus.NotFound, missingAgain.Status);
    }

    private static ProviderProfile NewProfile(string summary)
    {
        return new ProviderProfile
        {
            Name = "Test Provider",
            Role = "Therapist",
            Summary = summary,
            LongDescription = "A longer bio.",
            AvatarColor = "#9CAF88",
            VisibilityStatus = "Published",
        };
    }

    private static AiDbDiagnosticsService CreateService(ApplicationDbContext db)
    {
        return new AiDbDiagnosticsService(new AiDbDiagnosticsRepository(db));
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }
}
