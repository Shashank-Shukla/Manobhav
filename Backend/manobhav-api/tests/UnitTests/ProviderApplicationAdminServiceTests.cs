using Application.DTOs;
using Application.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace UnitTests;

public sealed class ProviderApplicationAdminServiceTests
{
    private static readonly string[] RequiredReviewSectionKeys =
    [
        "basicIdentity",
        "bioAndApproach",
        "specializations",
        "therapyApproaches",
        "sessionDetails",
        "credentials",
        "payout"
    ];

    [Fact]
    public async Task SaveSectionReview_ThrowsConflictForNonSubmittedApplication()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        application.Status = "Approved";
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var exception = await Assert.ThrowsAsync<ProviderApplicationConflictException>(() =>
            service.SaveSectionReviewAsync(
                application.Id,
                "basicIdentity",
                new ProviderApplicationSectionReviewRequest { Status = "Approved" },
                CancellationToken.None));

        Assert.Equal(409, exception.StatusCode);
        Assert.Empty(db.ProviderApplicationSectionReviews);
    }

    [Fact]
    public async Task Approve_ThrowsConflictForNonSubmittedApplicationAndDoesNotGrantProviderRole()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id, includeAllSections: true);
        application.Status = "Approved";
        AddApprovedReviews(db, application.Id, RequiredReviewSectionKeys);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var exception = await Assert.ThrowsAsync<ProviderApplicationConflictException>(() =>
            service.ApproveAsync(application.Id, CancellationToken.None));

        Assert.Equal(409, exception.StatusCode);
        Assert.False(await db.UserRoles.AnyAsync(role => role.UserId == user.Id && role.Role == "Provider"));
    }

    [Fact]
    public async Task Reject_ThrowsConflictForAlreadyRejectedApplication()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        application.Status = "Rejected";
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var exception = await Assert.ThrowsAsync<ProviderApplicationConflictException>(() =>
            service.RejectAsync(application.Id, CancellationToken.None));

        Assert.Equal(409, exception.StatusCode);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Rejected", saved!.Status);
    }

    [Fact]
    public async Task SaveSectionReview_RejectsRejectedStatusWithoutComment()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var service = CreateService(db);

        var exception = await Assert.ThrowsAsync<ProviderApplicationValidationException>(() =>
            service.SaveSectionReviewAsync(
                application.Id,
                "basicIdentity",
                new ProviderApplicationSectionReviewRequest { Status = "Rejected", Comment = "   " },
                CancellationToken.None));

        Assert.Equal(400, exception.StatusCode);
        Assert.Empty(db.ProviderApplicationSectionReviews);
    }

    [Fact]
    public async Task SaveSectionReview_RejectsSectionKeysNotPresentInApplicationSections()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var service = CreateService(db);

        var exception = await Assert.ThrowsAsync<ProviderApplicationValidationException>(() =>
            service.SaveSectionReviewAsync(
                application.Id,
                "credentials",
                new ProviderApplicationSectionReviewRequest { Status = "Approved" },
                CancellationToken.None));

        Assert.Equal(400, exception.StatusCode);
        Assert.Empty(db.ProviderApplicationSectionReviews);
    }

    [Fact]
    public async Task SaveSectionReview_RejectsCommentOverMaxLength()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var service = CreateService(db);

        var exception = await Assert.ThrowsAsync<ProviderApplicationValidationException>(() =>
            service.SaveSectionReviewAsync(
                application.Id,
                "basicIdentity",
                new ProviderApplicationSectionReviewRequest { Status = "Approved", Comment = new string('x', 2001) },
                CancellationToken.None));

        Assert.Equal(400, exception.StatusCode);
        Assert.Empty(db.ProviderApplicationSectionReviews);
    }

    [Fact]
    public async Task SaveSectionReview_UpsertsSectionReviewAndReturnsDto()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var service = CreateService(db);

        var approvedDto = await service.SaveSectionReviewAsync(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest { Status = "Approved", Comment = "Identity verified." },
            CancellationToken.None);

        Assert.Equal("Approved", approvedDto.SectionReviews["basicIdentity"].Status);
        Assert.Equal("Identity verified.", approvedDto.SectionReviews["basicIdentity"].Comment);

        var rejectedDto = await service.SaveSectionReviewAsync(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest { Status = "Rejected", Comment = "Email does not match credential documents." },
            CancellationToken.None);

        var storedReview = Assert.Single(db.ProviderApplicationSectionReviews);
        Assert.Equal(storedReview.Id, rejectedDto.SectionReviews["basicIdentity"].Id);
        Assert.Equal("Rejected", rejectedDto.SectionReviews["basicIdentity"].Status);
        Assert.Equal("Email does not match credential documents.", rejectedDto.SectionReviews["basicIdentity"].Comment);
    }

    [Fact]
    public async Task SaveSectionReview_RetriesWhenConcurrentInsertWinsUniqueSectionReviewRace()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;
        await using (var schemaDb = new ApplicationDbContext(options))
        {
            await schemaDb.Database.EnsureCreatedAsync();
        }

        await using (var seedDb = new ApplicationDbContext(options))
        {
            var user = await AddUserAsync(seedDb);
            await AddSubmittedApplicationAsync(seedDb, user.Id);
        }

        await using var db = new RaceOnProviderSectionReviewInsertDbContext(options)
        {
            ThrowOnNextSectionReviewInsert = true
        };
        var application = await db.ProviderOnboardingApplications.SingleAsync();
        var service = CreateService(db);

        var dto = await service.SaveSectionReviewAsync(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest { Status = "Approved", Comment = "Identity verified after concurrent review." },
            CancellationToken.None);

        var storedReview = Assert.Single(await db.ProviderApplicationSectionReviews.ToListAsync());
        Assert.Equal(storedReview.Id, dto.SectionReviews["basicIdentity"].Id);
        Assert.Equal("Approved", storedReview.Status);
        Assert.Equal("Identity verified after concurrent review.", storedReview.Comment);
    }

    [Fact]
    public async Task Approve_RequiresEveryCanonicalSectionPresentAndApproved()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        application.SessionDetailsJson = """
            {
              "credentials": {
                "items": [{
                  "title": "Clinical Psychologist",
                  "institution": "RCI"
                }]
              }
            }
            """;
        AddApprovedReviews(db, application.Id, ["basicIdentity", "credentials"]);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var blocked = await Assert.ThrowsAsync<ProviderApplicationValidationException>(() =>
            service.ApproveAsync(application.Id, CancellationToken.None));
        Assert.Equal(400, blocked.StatusCode);
        Assert.False(await db.UserRoles.AnyAsync(role => role.UserId == user.Id && role.Role == "Provider"));

        SeedCompleteApplicationSections(application);
        AddApprovedReviews(
            db,
            application.Id,
            RequiredReviewSectionKeys.Except(["basicIdentity", "credentials"], StringComparer.Ordinal));
        await db.SaveChangesAsync();

        await service.ApproveAsync(application.Id, CancellationToken.None);

        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Approved", saved!.Status);
        Assert.True(await db.UserRoles.AnyAsync(role => role.UserId == user.Id && role.Role == "Provider"));
    }

    [Fact]
    public async Task Reject_RejectsSubmittedApplicationDirectly()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var service = CreateService(db);

        await service.RejectAsync(application.Id, CancellationToken.None);

        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Rejected", saved!.Status);
        Assert.NotNull(saved.RejectedAtUtc);
    }

    [Fact]
    public async Task Reject_SoftDeletesApprovedProviderAndActivities()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        application.Status = "Approved";
        var profile = new ProviderProfile
        {
            ProviderApplicationId = application.Id,
            UserId = user.Id,
            Name = "Asha Rao",
            VisibilityStatus = "Published",
            IsActive = true,
        };
        db.ProviderProfiles.Add(profile);
        db.UserRoles.Add(new UserRole { UserId = user.Id, Role = "Provider", IsActive = true });
        db.Appointments.Add(new Appointment
        {
            ProviderProfileId = profile.Id,
            PatientUserId = Guid.NewGuid(),
            StartsAtUtc = DateTimeOffset.UtcNow.AddDays(1),
            EndsAtUtc = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            Status = "Scheduled",
        });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        await service.RejectAsync(application.Id, CancellationToken.None);

        var savedProfile = await db.ProviderProfiles.FindAsync([profile.Id], CancellationToken.None);
        Assert.False(savedProfile!.IsActive);
        Assert.Equal("Hidden", savedProfile.VisibilityStatus);
        Assert.Equal("Cancelled", (await db.Appointments.SingleAsync()).Status);
        Assert.False(await db.UserRoles.AnyAsync(role => role.UserId == user.Id && role.IsActive));
    }

    [Fact]
    public async Task Approve_MaterializesPublishedProviderProfileWithOnboardingDetails()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id, includeAllSections: true);
        AddApprovedReviews(db, application.Id, RequiredReviewSectionKeys);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        await service.ApproveAsync(application.Id, CancellationToken.None);

        var profile = await db.ProviderProfiles.SingleAsync(item => item.ProviderApplicationId == application.Id);
        Assert.True(profile.IsActive);
        Assert.Equal("Published", profile.VisibilityStatus);
        Assert.NotNull(profile.PublishedAtUtc);
        // The onboarding details must be carried onto the published profile (the P0 regression guard).
        Assert.Equal("Asha Rao", profile.DisplayName);
        Assert.Equal("Trauma informed therapist", profile.Summary);
        Assert.Contains("Anxiety", profile.SpecializationsJson);
        Assert.Contains("English", profile.LanguagesJson);
        Assert.Contains("\"dayOfWeek\":1", profile.WeeklyAvailabilityJson);
        Assert.Contains("09:00", profile.WeeklyAvailabilityJson);
    }

    [Fact]
    public async Task Publish_BackfillsProfileDataFromApplication()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id, includeAllSections: true);
        application.Status = "Approved";
        // A profile materialized before the data-copy fix: published but with empty details.
        var profile = new ProviderProfile
        {
            ProviderApplicationId = application.Id,
            UserId = user.Id,
            Name = "Asha Rao",
            VisibilityStatus = "Published",
            IsActive = true,
            Summary = string.Empty,
            SpecializationsJson = "[]",
            WeeklyAvailabilityJson = "[]",
        };
        db.ProviderProfiles.Add(profile);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        await service.PublishProfileAsync(profile.Id, CancellationToken.None);

        var saved = await db.ProviderProfiles.FindAsync([profile.Id], CancellationToken.None);
        Assert.Equal("Trauma informed therapist", saved!.Summary);
        Assert.Contains("Anxiety", saved.SpecializationsJson);
        Assert.Contains("\"dayOfWeek\":1", saved.WeeklyAvailabilityJson);
        Assert.True(saved.IsActive);
        Assert.Equal("Published", saved.VisibilityStatus);
    }

    [Fact]
    public async Task Get_ReturnsSectionReviewsWithApplicationSections()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        db.ProviderApplicationSectionReviews.Add(new ProviderApplicationSectionReview
        {
            ProviderApplicationId = application.Id,
            SectionKey = "basicIdentity",
            Status = "Rejected",
            Comment = "Phone number is missing."
        });
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var dto = await service.GetAsync(application.Id, CancellationToken.None);

        Assert.Equal("Dr. Asha Rao", dto.Sections["basicIdentity"].GetProperty("legalName").GetString());
        Assert.Equal("Rejected", dto.SectionReviews["basicIdentity"].Status);
        Assert.Equal("Phone number is missing.", dto.SectionReviews["basicIdentity"].Comment);
    }

    private static ProviderApplicationAdminService CreateService(ApplicationDbContext db)
    {
        return new ProviderApplicationAdminService(new ProviderApplicationRepository(db), new ProviderProfileMaterializer());
    }

    private static async Task<User> AddUserAsync(ApplicationDbContext db)
    {
        var user = new User
        {
            CognitoSubject = "provider-subject",
            Email = "provider@example.com",
            DisplayName = "Provider"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<ProviderOnboardingApplication> AddSubmittedApplicationAsync(
        ApplicationDbContext db,
        Guid userId,
        bool includeAllSections = false)
    {
        var application = new ProviderOnboardingApplication
        {
            UserId = userId,
            Status = "Submitted",
            CurrentStep = "review",
            SubmittedAtUtc = DateTimeOffset.UtcNow,
            BasicProfileJson = """
                {
                  "legalName": "Dr. Asha Rao",
                  "displayName": "Asha Rao",
                  "email": "asha@example.com"
                }
                """
        };
        if (includeAllSections)
        {
            SeedCompleteApplicationSections(application);
        }

        db.ProviderOnboardingApplications.Add(application);
        await db.SaveChangesAsync();
        return application;
    }

    private static void SeedCompleteApplicationSections(ProviderOnboardingApplication application)
    {
        application.BasicProfileJson = """
            {
              "legalName": "Dr. Asha Rao",
              "displayName": "Asha Rao",
              "email": "asha@example.com"
            }
            """;
        application.BioJson = """
            {
              "bio": {
                "shortBio": "Trauma informed therapist",
                "languages": ["English", "Hindi"]
              },
              "specializations": {
                "focusAreas": ["Anxiety"],
                "ageGroups": ["Adults"]
              },
              "modalities": {
                "modalities": ["ACT"]
              }
            }
            """;
        application.SessionDetailsJson = """
            {
              "sessionDetails": {
                "availabilitySlots": [{ "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00" }],
                "capacityPerWeek": 12
              },
              "credentials": {
                "items": [{
                  "credentialType": "License",
                  "title": "Clinical Psychologist",
                  "institution": "RCI",
                  "licenseNumber": "A123"
                }]
              },
              "payout": {
                "accountNumber": "123456789012",
                "bankName": "HDFC Bank",
                "ifscCode": "HDFC0001234"
              }
            }
            """;
    }

    private static void AddApprovedReviews(ApplicationDbContext db, Guid applicationId, IEnumerable<string> sectionKeys)
    {
        foreach (var sectionKey in sectionKeys)
        {
            db.ProviderApplicationSectionReviews.Add(new ProviderApplicationSectionReview
            {
                ProviderApplicationId = applicationId,
                SectionKey = sectionKey,
                Status = "Approved"
            });
        }
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private sealed class RaceOnProviderSectionReviewInsertDbContext : ApplicationDbContext
    {
        private readonly DbContextOptions<ApplicationDbContext> _options;

        public RaceOnProviderSectionReviewInsertDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
            _options = options;
        }

        public bool ThrowOnNextSectionReviewInsert { get; set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var pendingReview = ChangeTracker.Entries<ProviderApplicationSectionReview>()
                .FirstOrDefault(entry => entry.State == EntityState.Added)
                ?.Entity;

            if (ThrowOnNextSectionReviewInsert && pendingReview is not null)
            {
                ThrowOnNextSectionReviewInsert = false;
                await using var competingDb = new ApplicationDbContext(_options);
                competingDb.ProviderApplicationSectionReviews.Add(new ProviderApplicationSectionReview
                {
                    ProviderApplicationId = pendingReview.ProviderApplicationId,
                    SectionKey = pendingReview.SectionKey,
                    Status = "Rejected",
                    Comment = "Competing review",
                    ReviewedAtUtc = pendingReview.ReviewedAtUtc,
                    CreatedAtUtc = pendingReview.CreatedAtUtc
                });
                await competingDb.SaveChangesAsync(cancellationToken);
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
