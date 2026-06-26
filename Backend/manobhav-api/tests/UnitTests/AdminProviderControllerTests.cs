using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using WebApi.Controllers;

namespace UnitTests;

public sealed class AdminProviderControllerTests
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
    public async Task SaveSectionReview_ReturnsConflictForNonSubmittedApplication()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        application.Status = "Approved";
        await db.SaveChangesAsync();
        var controller = new AdminProviderController(db);

        var result = await controller.SaveSectionReview(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest { Status = "Approved" },
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
        Assert.Empty(db.ProviderApplicationSectionReviews);
    }

    [Fact]
    public async Task Approve_ReturnsConflictForNonSubmittedApplicationAndDoesNotGrantProviderRole()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id, includeAllSections: true);
        application.Status = "Approved";
        AddApprovedReviews(db, application.Id, RequiredReviewSectionKeys);
        await db.SaveChangesAsync();
        var controller = new AdminProviderController(db);

        var result = await controller.Approve(application.Id, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
        Assert.False(await db.UserRoles.AnyAsync(role => role.UserId == user.Id && role.Role == "Provider"));
    }

    [Fact]
    public async Task Reject_ReturnsConflictForNonSubmittedApplication()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        application.Status = "Approved";
        db.ProviderApplicationSectionReviews.Add(new ProviderApplicationSectionReview
        {
            ProviderApplicationId = application.Id,
            SectionKey = "basicIdentity",
            Status = "Rejected",
            Comment = "Legal name does not match identity document."
        });
        await db.SaveChangesAsync();
        var controller = new AdminProviderController(db);

        var result = await controller.Reject(application.Id, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Approved", saved!.Status);
    }

    [Fact]
    public async Task SaveSectionReview_RejectsRejectedStatusWithoutComment()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var controller = new AdminProviderController(db);

        var result = await controller.SaveSectionReview(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest
            {
                Status = "Rejected",
                Comment = "   "
            },
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Empty(db.ProviderApplicationSectionReviews);
    }

    [Fact]
    public async Task SaveSectionReview_RejectsSectionKeysNotPresentInApplicationSections()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var controller = new AdminProviderController(db);

        var result = await controller.SaveSectionReview(
            application.Id,
            "credentials",
            new ProviderApplicationSectionReviewRequest
            {
                Status = "Approved"
            },
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Empty(db.ProviderApplicationSectionReviews);
    }

    [Fact]
    public async Task SaveSectionReview_RejectsCommentOverMaxLength()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var controller = new AdminProviderController(db);

        var result = await controller.SaveSectionReview(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest
            {
                Status = "Approved",
                Comment = new string('x', 2001)
            },
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Empty(db.ProviderApplicationSectionReviews);
    }

    [Fact]
    public async Task SaveSectionReview_UpsertsSectionReviewAndReturnsDto()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var controller = new AdminProviderController(db);

        var approvedResult = await controller.SaveSectionReview(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest
            {
                Status = "Approved",
                Comment = "Identity verified."
            },
            CancellationToken.None);

        var approvedOk = Assert.IsType<OkObjectResult>(approvedResult.Result);
        var approvedDto = Assert.IsType<ProviderApplicationDto>(approvedOk.Value);
        Assert.Equal("Approved", approvedDto.SectionReviews["basicIdentity"].Status);
        Assert.Equal("Identity verified.", approvedDto.SectionReviews["basicIdentity"].Comment);

        var rejectedResult = await controller.SaveSectionReview(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest
            {
                Status = "Rejected",
                Comment = "Email does not match credential documents."
            },
            CancellationToken.None);

        var rejectedOk = Assert.IsType<OkObjectResult>(rejectedResult.Result);
        var rejectedDto = Assert.IsType<ProviderApplicationDto>(rejectedOk.Value);
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
        var controller = new AdminProviderController(db);

        var result = await controller.SaveSectionReview(
            application.Id,
            "basicIdentity",
            new ProviderApplicationSectionReviewRequest
            {
                Status = "Approved",
                Comment = "Identity verified after concurrent review."
            },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ProviderApplicationDto>(ok.Value);
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
        var controller = new AdminProviderController(db);

        var blockedResult = await controller.Approve(application.Id, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(blockedResult);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.False(await db.UserRoles.AnyAsync(role => role.UserId == user.Id && role.Role == "Provider"));

        SeedCompleteApplicationSections(application);
        AddApprovedReviews(
            db,
            application.Id,
            RequiredReviewSectionKeys.Except(["basicIdentity", "credentials"], StringComparer.Ordinal));
        await db.SaveChangesAsync();

        var approvedResult = await controller.Approve(application.Id, CancellationToken.None);

        Assert.IsType<NoContentResult>(approvedResult);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Approved", saved!.Status);
        Assert.True(await db.UserRoles.AnyAsync(role => role.UserId == user.Id && role.Role == "Provider"));
    }

    [Fact]
    public async Task Reject_RequiresRejectedSectionWithComment()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddSubmittedApplicationAsync(db, user.Id);
        var controller = new AdminProviderController(db);

        var missingReviewResult = await controller.Reject(application.Id, CancellationToken.None);

        var missingProblem = Assert.IsType<ObjectResult>(missingReviewResult);
        Assert.Equal(StatusCodes.Status400BadRequest, missingProblem.StatusCode);

        db.ProviderApplicationSectionReviews.Add(new ProviderApplicationSectionReview
        {
            ProviderApplicationId = application.Id,
            SectionKey = "basicIdentity",
            Status = "Approved"
        });
        await db.SaveChangesAsync();

        var approvedOnlyResult = await controller.Reject(application.Id, CancellationToken.None);

        var approvedOnlyProblem = Assert.IsType<ObjectResult>(approvedOnlyResult);
        Assert.Equal(StatusCodes.Status400BadRequest, approvedOnlyProblem.StatusCode);

        var review = await db.ProviderApplicationSectionReviews.SingleAsync();
        review.Status = "Rejected";
        review.Comment = "Legal name does not match identity document.";
        await db.SaveChangesAsync();

        var rejectedResult = await controller.Reject(application.Id, CancellationToken.None);

        Assert.IsType<NoContentResult>(rejectedResult);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Rejected", saved!.Status);
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
        var controller = new AdminProviderController(db);

        var result = await controller.Get(application.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ProviderApplicationDto>(ok.Value);
        Assert.Equal("Dr. Asha Rao", dto.Sections["basicIdentity"].GetProperty("legalName").GetString());
        Assert.Equal("Rejected", dto.SectionReviews["basicIdentity"].Status);
        Assert.Equal("Phone number is missing.", dto.SectionReviews["basicIdentity"].Comment);
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
                "sessionLengthsMinutes": [60],
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
