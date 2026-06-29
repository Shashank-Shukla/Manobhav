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
    public async Task GetTable_Users_MasksEmailAndPhoneAndOmitsCognitoSubject()
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

        var rows = Assert.IsType<List<AiDbDiagnosticsUserDto>>(await service.GetTableAsync("users", 50, 0, CancellationToken.None));

        var user = Assert.Single(rows);
        Assert.Equal("j***@example.com", user.Email);
        Assert.Equal("*******678", user.Phone);
        Assert.Equal("Dr. John", user.DisplayName);
        // The DTO has no CognitoSubject member at all — redaction is enforced by the projection type.
        Assert.DoesNotContain("CognitoSubject", typeof(AiDbDiagnosticsUserDto).GetProperties().Select(property => property.Name));
    }

    [Fact]
    public async Task GetTable_ProviderApplications_ExposesBioButExtractsOnlyAvailabilitySlots()
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

        var rows = Assert.IsType<List<AiDbDiagnosticsProviderApplicationDto>>(
            await service.GetTableAsync("provider-applications", 50, 0, CancellationToken.None));

        var application = Assert.Single(rows);
        Assert.Contains("dayOfWeek", application.AvailabilitySlotsJson);
        // The payout/bank details from SessionDetailsJson must never leak through the projection.
        Assert.DoesNotContain("accountNumber", application.AvailabilitySlotsJson);
        Assert.DoesNotContain("ifscCode", application.AvailabilitySlotsJson);
    }

    [Fact]
    public async Task GetTable_ReturnsNullForUnknownTable()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db);

        Assert.Null(await service.GetTableAsync("email-otp-challenges", 50, 0, CancellationToken.None));
    }

    [Fact]
    public async Task GetSummary_ReportsCountsForExposedTablesOnly()
    {
        await using var db = CreateDbContext();
        db.Users.Add(new User { CognitoSubject = "s" });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var summary = await service.GetSummaryAsync(CancellationToken.None);

        Assert.Equal(service.Tables.OrderBy(table => table), summary.Select(item => item.Table).OrderBy(table => table));
        Assert.Equal(1, summary.Single(item => item.Table == "users").Count);
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
