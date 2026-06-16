using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace UnitTests;

public sealed class ApplicationDbContextAuditTests
{
    [Fact]
    public async Task SaveChanges_RedactsSensitiveFieldNamesAndNeverStoresValues()
    {
        await using var db = CreateDbContext();

        db.ProviderPayoutDetails.Add(new ProviderPayoutDetails
        {
            ProviderApplicationId = Guid.NewGuid(),
            PayoutMode = "BankTransfer",
            AccountHolderName = "Sensitive Person",
            AccountDetailsEncrypted = "encrypted-account-value",
            TaxIdentifierEncrypted = "encrypted-tax-value",
            Status = "Draft"
        });

        await db.SaveChangesAsync();

        var audit = Assert.Single(db.AuditLogs);
        Assert.Contains("[REDACTED_FIELD]", audit.ChangedFieldsJson);
        Assert.DoesNotContain("encrypted-account-value", audit.BeforeJson);
        Assert.DoesNotContain("encrypted-account-value", audit.AfterJson);
        Assert.DoesNotContain("encrypted-tax-value", audit.BeforeJson);
        Assert.DoesNotContain("encrypted-tax-value", audit.AfterJson);
        Assert.Equal("{}", audit.BeforeJson);
        Assert.Equal("{}", audit.AfterJson);
    }

    [Fact]
    public async Task SaveChanges_DoesNotRecursivelyAuditAuditLogRows()
    {
        await using var db = CreateDbContext();

        db.AuditLogs.Add(new AuditLog
        {
            ActorType = "System",
            Action = "Added",
            EntityType = "Manual",
            EntityId = Guid.NewGuid().ToString()
        });

        await db.SaveChangesAsync();

        Assert.Single(db.AuditLogs);
    }

    [Fact]
    public async Task SaveChanges_UsesHttpAuditContextWhenAvailable()
    {
        var actorUserId = Guid.NewGuid();
        var auditContext = new AuditRequestContext(
            HasHttpContext: true,
            IsAuthenticated: true,
            ActorUserId: actorUserId,
            ActorSubject: "authenticated-subject",
            CorrelationId: "correlation-123",
            RequestPath: "/api/visitor-sessions",
            IpAddress: "203.0.113.10",
            UserAgent: "UnitTest/1.0",
            IsAdmin: false);
        await using var db = CreateDbContext(new StubAuditContextAccessor(auditContext));

        db.VisitorSessions.Add(new VisitorSession
        {
            LandingPath = "/start"
        });

        await db.SaveChangesAsync();

        var audit = Assert.Single(db.AuditLogs);
        Assert.Equal("User", audit.ActorType);
        Assert.Equal(actorUserId, audit.ActorUserId);
        Assert.Equal("authenticated-subject", audit.ActorSubject);
        Assert.Equal("correlation-123", audit.CorrelationId);
        Assert.Equal("/api/visitor-sessions", audit.RequestPath);
        Assert.Equal("203.0.113.10", audit.IpAddress);
        Assert.Equal("UnitTest/1.0", audit.UserAgent);
    }

    private static ApplicationDbContext CreateDbContext(IAuditContextAccessor? auditContextAccessor = null)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options, auditContextAccessor);
    }

    private sealed class StubAuditContextAccessor : IAuditContextAccessor
    {
        public StubAuditContextAccessor(AuditRequestContext current)
        {
            Current = current;
        }

        public AuditRequestContext Current { get; }
    }
}
