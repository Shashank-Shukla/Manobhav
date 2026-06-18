using System.Security.Claims;
using System.Text.Json;
using Application.DTOs;
using Application.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using WebApi.Controllers;
using WebApi.Notifications;

namespace UnitTests;

public sealed class ProviderOnboardingControllerTests
{
    [Fact]
    public async Task SaveSection_RejectsUnknownSection()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        var controller = CreateProviderController(db);

        var result = await controller.SaveSection(
            application.Id,
            "not-a-section",
            new SaveProviderSectionRequest
            {
                BasicIdentity = new ProviderBasicIdentitySection
                {
                    LegalName = "Dr. Unknown",
                    DisplayName = "Dr. Unknown",
                    Email = "unknown@example.com"
                }
            },
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Fact]
    public async Task SaveSection_StoresTypedBasicIdentityAndRejectsBlobPayload()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        var controller = CreateProviderController(db);

        var result = await controller.SaveSection(
            application.Id,
            "basic-profile",
            new SaveProviderSectionRequest
            {
                BasicIdentity = new ProviderBasicIdentitySection
                {
                    LegalName = "Dr. Asha Rao",
                    DisplayName = "Asha Rao",
                    Email = "asha@example.com",
                    Phone = "+919999999999",
                    Location = "Bengaluru"
                },
                CurrentStep = "bio"
            },
            CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        using var json = JsonDocument.Parse(saved!.BasicProfileJson);
        Assert.Equal("Dr. Asha Rao", json.RootElement.GetProperty("legalName").GetString());
        Assert.Equal("bio", saved.CurrentStep);

        var blobResult = await controller.SaveSection(
            application.Id,
            "basic-profile",
            new SaveProviderSectionRequest
            {
                ExtensionData = new Dictionary<string, JsonElement>
                {
                    ["sectionJson"] = JsonDocument.Parse("""{"anything":true}""").RootElement.Clone()
                }
            },
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(blobResult);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Theory]
    [InlineData("Submitted")]
    [InlineData("Approved")]
    [InlineData("Suspended")]
    [InlineData("Rejected")]
    public async Task SaveSection_RejectsNonDraftApplicationStatus(string status)
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        application.Status = status;
        application.BasicProfileJson = """
            {
              "legalName": "Dr. Original Rao",
              "displayName": "Original Rao",
              "email": "original@example.com"
            }
            """;
        await db.SaveChangesAsync();
        var controller = CreateProviderController(db);

        var result = await controller.SaveSection(
            application.Id,
            "basic-profile",
            new SaveProviderSectionRequest
            {
                BasicIdentity = new ProviderBasicIdentitySection
                {
                    LegalName = "Dr. Edited Rao",
                    DisplayName = "Edited Rao",
                    Email = "edited@example.com"
                }
            },
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, problem.StatusCode);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal(status, saved!.Status);
        using var json = JsonDocument.Parse(saved.BasicProfileJson);
        Assert.Equal("Dr. Original Rao", json.RootElement.GetProperty("legalName").GetString());
    }

    [Fact]
    public async Task GetMine_ReturnsSavedSectionsForDraftHydration()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        application.BasicProfileJson = """
            {
              "legalName": "Dr. Hydrate Rao",
              "displayName": "Hydrate Rao",
              "email": "hydrate@example.com",
              "phone": "+919999999999",
              "location": "Bengaluru"
            }
            """;
        application.BioJson = """
            {
              "bio": {
                "shortBio": "Therapist",
                "longBio": "Long bio",
                "approach": "I practice ACT.",
                "languages": ["English", "Hindi"]
              },
              "specializations": {
                "focusAreas": ["Anxiety"],
                "ageGroups": ["Adults"],
                "therapyGoals": ["Stress"]
              },
              "modalities": {
                "modalities": ["ACT - Acceptance & Commitment Therapy"],
                "deliveryModes": ["Online"]
              }
            }
            """;
        application.SessionDetailsJson = """
            {
              "sessionDetails": {
                "sessionLengthsMinutes": [60],
                "availabilitySummary": "Weekdays",
                "capacityPerWeek": 12
              },
              "credentials": {
                "items": [{
                  "credentialType": "License",
                  "title": "Clinical Psychologist",
                  "institution": "RCI",
                  "licenseNumber": "A123",
                  "year": 2020
                }]
              },
              "payout": {
                "payoutMode": "Bank",
                "accountHolderName": "Hydrate Rao",
                "notes": "Verified later"
              }
            }
            """;
        await db.SaveChangesAsync();
        var controller = CreateProviderController(db);

        var result = await controller.GetMine(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ProviderApplicationDto>(ok.Value);
        var sectionsProperty = dto.GetType().GetProperty("Sections");
        Assert.NotNull(sectionsProperty);
        var sections = Assert.IsAssignableFrom<IReadOnlyDictionary<string, JsonElement>>(sectionsProperty!.GetValue(dto));
        Assert.Equal("Dr. Hydrate Rao", sections["basicIdentity"].GetProperty("legalName").GetString());
        Assert.Equal("I practice ACT.", sections["bioAndApproach"].GetProperty("approach").GetString());
        Assert.Equal("Anxiety", sections["specializations"].GetProperty("focusAreas")[0].GetString());
        Assert.Equal("ACT - Acceptance & Commitment Therapy", sections["therapyApproaches"].GetProperty("modalities")[0].GetString());
        Assert.Equal(60, sections["sessionDetails"].GetProperty("sessionLengthsMinutes")[0].GetInt32());
        Assert.Equal("Clinical Psychologist", sections["credentials"].GetProperty("items")[0].GetProperty("title").GetString());
        Assert.Equal("Bank", sections["payout"].GetProperty("payoutMode").GetString());
    }

    [Fact]
    public async Task SavePayout_CanPersistReviewAsCurrentStepAndReloadsReview()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        var controller = CreateProviderController(db);

        var result = await controller.SaveSection(
            application.Id,
            "payout",
            new SaveProviderSectionRequest
            {
                Payout = new ProviderPayoutSection
                {
                    PayoutMode = "Bank transfer",
                    AccountHolderName = "Dr. Review Ready",
                    Notes = "Ready for review"
                },
                CurrentStep = "review"
            },
            CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("review", saved!.CurrentStep);

        var reloadResult = await controller.GetMine(CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(reloadResult);
        var dto = Assert.IsType<ProviderApplicationDto>(ok.Value);
        Assert.Equal("review", dto.CurrentStep);
    }

    [Fact]
    public async Task Submit_RejectsIncompleteApplication()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        application.BasicProfileJson = """
            {
              "legalName": "Dr. Incomplete Rao",
              "displayName": "Incomplete Rao",
              "email": "incomplete@example.com"
            }
            """;
        await db.SaveChangesAsync();
        var notifier = new RecordingProviderOnboardingAdminNotifier();
        var controller = CreateProviderController(db, notifier);

        var result = await controller.Submit(application.Id, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Draft", saved!.Status);
        Assert.Null(saved.SubmittedAtUtc);
        Assert.Empty(notifier.Sent);
    }

    [Fact]
    public async Task Submit_RejectsInvalidRequiredSectionFields()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        SeedCompleteProviderApplication(application);
        application.SessionDetailsJson = """
            {
              "sessionDetails": {
                "sessionLengthsMinutes": [60],
                "availabilitySummary": "Weekdays",
                "capacityPerWeek": 12
              },
              "credentials": {
                "items": []
              },
              "payout": {
                "payoutMode": "Bank",
                "accountHolderName": "Submitted Rao",
                "notes": "Verified later"
              }
            }
            """;
        await db.SaveChangesAsync();
        var notifier = new RecordingProviderOnboardingAdminNotifier();
        var controller = CreateProviderController(db, notifier);

        var result = await controller.Submit(application.Id, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Draft", saved!.Status);
        Assert.Null(saved.SubmittedAtUtc);
        Assert.Empty(notifier.Sent);
    }

    [Fact]
    public async Task Submit_MarksDraftAsSubmitted()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        SeedCompleteProviderApplication(application);
        await db.SaveChangesAsync();
        var notifier = new RecordingProviderOnboardingAdminNotifier();
        var controller = CreateProviderController(db, notifier);

        var result = await controller.Submit(application.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ProviderApplicationDto>(ok.Value);
        Assert.Equal("Submitted", dto.Status);
        Assert.NotNull(dto.SubmittedAtUtc);
        var sent = Assert.Single(notifier.Sent);
        Assert.Equal(application.Id, sent.ApplicationId);
        Assert.Equal(user.Id, sent.UserId);
        Assert.Equal("Submitted Rao", sent.ProviderDisplayName);
        Assert.Equal("submitted@example.com", sent.ProviderEmail);
        Assert.Equal("Submitted Rao", sent.Sections["basicIdentity"].GetProperty("displayName").GetString());
    }

    [Fact]
    public async Task Submit_RetriesNotificationForAlreadySubmittedApplication()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        var submittedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        SeedCompleteProviderApplication(application);
        application.Status = "Submitted";
        application.SubmittedAtUtc = submittedAt;
        await db.SaveChangesAsync();
        var notifier = new RecordingProviderOnboardingAdminNotifier();
        var controller = CreateProviderController(db, notifier);

        var result = await controller.Submit(application.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ProviderApplicationDto>(ok.Value);
        Assert.Equal("Submitted", dto.Status);
        Assert.Equal(submittedAt, dto.SubmittedAtUtc);
        var sent = Assert.Single(notifier.Sent);
        Assert.Equal(application.Id, sent.ApplicationId);
        Assert.Equal(submittedAt, sent.SubmittedAtUtc);
    }

    [Fact]
    public async Task Submit_WhenNotificationFails_DoesNotPersistSubmittedStatus()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        SeedCompleteProviderApplication(application);
        var notifier = new FailingProviderOnboardingAdminNotifier();
        var controller = CreateProviderController(db, notifier);

        var result = await controller.Submit(application.Id, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, problem.StatusCode);
        var saved = await db.ProviderOnboardingApplications.FindAsync([application.Id], CancellationToken.None);
        Assert.Equal("Draft", saved!.Status);
        Assert.Null(saved.SubmittedAtUtc);
        Assert.Equal(1, notifier.Attempts);
    }

    [Fact]
    public async Task CompleteDocument_RejectsDocumentForAnotherProviderApplication()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var otherUser = new User
        {
            CognitoSubject = "other-provider-subject",
            Email = "other-provider@example.com",
            DisplayName = "Other Provider"
        };
        db.Users.Add(otherUser);
        await db.SaveChangesAsync();

        var ownedApplication = await AddApplicationAsync(db, user.Id);
        var otherApplication = await AddApplicationAsync(db, otherUser.Id);
        var document = new ProviderDocument
        {
            ProviderApplicationId = otherApplication.Id,
            Category = "license",
            S3Key = "providers/other/license.pdf",
            Status = "Uploaded"
        };
        db.ProviderDocuments.Add(document);
        await db.SaveChangesAsync();

        var controller = CreateProviderController(db);

        var wrongApplicationResult = await controller.CompleteDocument(
            ownedApplication.Id,
            document.Id,
            CancellationToken.None);
        var directOtherApplicationResult = await controller.CompleteDocument(
            otherApplication.Id,
            document.Id,
            CancellationToken.None);

        Assert.IsType<NotFoundResult>(wrongApplicationResult);
        Assert.IsType<NotFoundResult>(directOtherApplicationResult);
    }

    [Fact]
    public void AdminProviderController_RequiresAdminOnlyPolicy()
    {
        var attribute = Assert.Single(typeof(AdminProviderController).GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true));
        Assert.Equal("AdminOnly", ((AuthorizeAttribute)attribute).Policy);
    }

    [Fact]
    public async Task AdminProviderController_Get_ReturnsFullSubmittedApplicationSections()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        application.Status = "Submitted";
        application.SubmittedAtUtc = DateTimeOffset.UtcNow;
        application.BasicProfileJson = """
            {
              "legalName": "Dr. Asha Rao",
              "displayName": "Asha Rao",
              "email": "asha@example.com"
            }
            """;
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
        await db.SaveChangesAsync();
        var controller = new AdminProviderController(db);

        var result = await controller.Get(application.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ProviderApplicationDto>(ok.Value);
        Assert.Equal(application.Id, dto.Id);
        Assert.Equal("Dr. Asha Rao", dto.Sections["basicIdentity"].GetProperty("legalName").GetString());
        Assert.Equal("Clinical Psychologist", dto.Sections["credentials"].GetProperty("items")[0].GetProperty("title").GetString());
    }

    [Fact]
    public void AdminNotificationsController_RequiresAdminOnlyPolicy()
    {
        var attribute = Assert.Single(typeof(AdminNotificationsController).GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true));
        Assert.Equal("AdminOnly", ((AuthorizeAttribute)attribute).Policy);
    }

    [Fact]
    public async Task AdminNotificationsController_List_DerivesUnreadSubmittedApplicationNotifications()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        application.Status = "Submitted";
        application.SubmittedAtUtc = DateTimeOffset.UtcNow;
        application.BasicProfileJson = """{"displayName":"Dr. Asha Rao"}""";
        await db.SaveChangesAsync();
        var controller = new AdminNotificationsController(db);

        var result = await controller.List(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var notifications = Assert.IsAssignableFrom<IReadOnlyList<AdminNotificationDto>>(ok.Value);
        var notification = Assert.Single(notifications);
        Assert.Equal($"provider-application-submitted-{application.Id:N}", notification.Id);
        Assert.Null(notification.ReadAtUtc);
        Assert.Contains(application.Id.ToString(), notification.LinkPath, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AdminNotificationsController_MarkRead_HidesDerivedApplicationNotification()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        application.Status = "Submitted";
        application.SubmittedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        var controller = new AdminNotificationsController(db);
        var notificationId = $"provider-application-submitted-{application.Id:N}";

        var markReadResult = await controller.MarkRead(notificationId, CancellationToken.None);
        var listResult = await controller.List(CancellationToken.None);

        Assert.IsType<NoContentResult>(markReadResult);
        var ok = Assert.IsType<OkObjectResult>(listResult.Result);
        var notifications = Assert.IsAssignableFrom<IReadOnlyList<AdminNotificationDto>>(ok.Value);
        Assert.Empty(notifications);
        Assert.NotNull(await db.AdminNotifications.SingleOrDefaultAsync(item => item.NotificationKey == notificationId));
    }

    [Fact]
    public async Task AdminNotificationsController_MarkRead_TreatsConcurrentDerivedTombstoneInsertAsSuccess()
    {
        var databaseName = Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        await using var db = new RaceOnAdminNotificationInsertDbContext(options);
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        application.Status = "Submitted";
        application.SubmittedAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        db.ThrowOnNextAdminNotificationInsert = true;
        var controller = new AdminNotificationsController(db);
        var notificationId = $"provider-application-submitted-{application.Id:N}";

        var result = await controller.MarkRead(notificationId, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.NotNull(await db.AdminNotifications.SingleOrDefaultAsync(item => item.NotificationKey == notificationId));
    }

    [Fact]
    public async Task AdminNotificationsController_List_OnlyUsesProviderApplicationReadTombstonesForDerivedSuppression()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        application.Status = "Submitted";
        application.SubmittedAtUtc = DateTimeOffset.UtcNow;
        application.BasicProfileJson = """{"displayName":"Dr. Visible Rao"}""";
        db.AdminNotifications.Add(new AdminNotification
        {
            NotificationKey = $"provider-application-submitted-{application.Id:N}",
            Type = "AdminNotification",
            Title = "Unrelated read tombstone",
            Body = string.Empty,
            LinkPath = string.Empty,
            ReadAtUtc = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();
        var controller = new AdminNotificationsController(db);

        var result = await controller.List(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var notifications = Assert.IsAssignableFrom<IReadOnlyList<AdminNotificationDto>>(ok.Value);
        Assert.Contains(notifications, item => item.Id == $"provider-application-submitted-{application.Id:N}");
    }

    [Fact]
    public void ProviderOnboardingNotificationOptions_DefaultsIncludeRequiredAdminRecipients()
    {
        var options = new ProviderOnboardingNotificationOptions();

        Assert.Contains("shashankshowstoper@gmail.com", options.AdminRecipients);
        Assert.Contains("manobhavcounsellingservices@gmail.com", options.AdminRecipients);
        Assert.Equal("no-reply@manobhav.co.in", options.FromEmail);
        Assert.Equal("Manobhav", options.FromDisplayName);
        Assert.Equal("ap-south-1", options.AwsRegion);
    }

    [Fact]
    public async Task SesProviderOnboardingAdminNotifier_SendsEmailWithDefaultSenderAndAdminRecipients()
    {
        var sesClient = new RecordingProviderOnboardingSesClient();
        var notifier = new SesProviderOnboardingAdminNotifier(
            sesClient,
            Options.Create(new ProviderOnboardingNotificationOptions()),
            NullLogger<SesProviderOnboardingAdminNotifier>.Instance);
        var applicationId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var sections = new Dictionary<string, JsonElement>(StringComparer.Ordinal)
        {
            ["basicIdentity"] = JsonDocument.Parse("""{"displayName":"Dr. Asha Rao","email":"asha@example.com"}""").RootElement.Clone()
        };

        await notifier.NotifySubmittedAsync(
            new ProviderOnboardingAdminNotification(
                applicationId,
                userId,
                "Dr. Asha Rao",
                "asha@example.com",
                DateTimeOffset.Parse("2026-06-18T00:00:00Z"),
                sections),
            CancellationToken.None);

        var email = Assert.Single(sesClient.Sent);
        Assert.Contains("Manobhav", email.FromEmailAddress, StringComparison.Ordinal);
        Assert.Contains("no-reply@manobhav.co.in", email.FromEmailAddress, StringComparison.Ordinal);
        Assert.Contains("shashankshowstoper@gmail.com", email.ToAddresses);
        Assert.Contains("manobhavcounsellingservices@gmail.com", email.ToAddresses);
        Assert.Contains("Dr. Asha Rao", email.Subject, StringComparison.Ordinal);
        Assert.Contains(applicationId.ToString(), email.TextBody, StringComparison.Ordinal);
        Assert.Contains("asha@example.com", email.TextBody, StringComparison.Ordinal);
    }

    private static ProviderOnboardingController CreateProviderController(
        ApplicationDbContext db,
        IProviderOnboardingAdminNotifier? notifier = null)
    {
        var controller = new ProviderOnboardingController(
            db,
            new ProviderOnboardingSectionService(),
            notifier ?? new RecordingProviderOnboardingAdminNotifier())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim("sub", "provider-subject"),
                        new Claim("email", "provider@example.com")
                    ], "TestAuth"))
                }
            }
        };
        return controller;
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

    private static async Task<ProviderOnboardingApplication> AddApplicationAsync(ApplicationDbContext db, Guid userId)
    {
        var application = new ProviderOnboardingApplication
        {
            UserId = userId,
            Status = "Draft",
            CurrentStep = "basic-profile"
        };
        db.ProviderOnboardingApplications.Add(application);
        await db.SaveChangesAsync();
        return application;
    }

    private static void SeedCompleteProviderApplication(ProviderOnboardingApplication application)
    {
        application.BasicProfileJson = """
            {
              "legalName": "Dr. Submitted Rao",
              "displayName": "Submitted Rao",
              "email": "submitted@example.com",
              "phone": "+919999999999",
              "location": "Mumbai"
            }
            """;
        application.BioJson = """
            {
              "bio": {
                "shortBio": "Trauma informed therapist",
                "longBio": "Long bio",
                "approach": "ACT and mindfulness",
                "languages": ["English", "Hindi"]
              },
              "specializations": {
                "focusAreas": ["Anxiety"],
                "ageGroups": ["Adults"],
                "therapyGoals": ["Stress"]
              },
              "modalities": {
                "modalities": ["ACT"],
                "deliveryModes": ["Online"]
              }
            }
            """;
        application.SessionDetailsJson = """
            {
              "sessionDetails": {
                "sessionLengthsMinutes": [60],
                "availabilitySummary": "Weekdays",
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
                "payoutMode": "Bank",
                "accountHolderName": "Submitted Rao",
                "notes": "Verified later"
              }
            }
            """;
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private sealed class RaceOnAdminNotificationInsertDbContext : ApplicationDbContext
    {
        private readonly DbContextOptions<ApplicationDbContext> _options;

        public RaceOnAdminNotificationInsertDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
            _options = options;
        }

        public bool ThrowOnNextAdminNotificationInsert { get; set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var pendingNotification = ChangeTracker.Entries<AdminNotification>()
                .FirstOrDefault(entry => entry.State == EntityState.Added)
                ?.Entity;

            if (ThrowOnNextAdminNotificationInsert && pendingNotification is not null)
            {
                ThrowOnNextAdminNotificationInsert = false;
                Entry(pendingNotification).State = EntityState.Detached;
                await using var competingDb = new ApplicationDbContext(_options);
                competingDb.AdminNotifications.Add(new AdminNotification
                {
                    NotificationKey = pendingNotification.NotificationKey,
                    Type = pendingNotification.Type,
                    Title = pendingNotification.Title,
                    Body = pendingNotification.Body,
                    LinkPath = pendingNotification.LinkPath,
                    CreatedAtUtc = pendingNotification.CreatedAtUtc,
                    ReadAtUtc = pendingNotification.ReadAtUtc
                });
                await competingDb.SaveChangesAsync(cancellationToken);
                throw new DbUpdateException("Simulated duplicate admin notification key.");
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }

    private sealed class RecordingProviderOnboardingAdminNotifier : IProviderOnboardingAdminNotifier
    {
        public List<ProviderOnboardingAdminNotification> Sent { get; } = [];

        public Task NotifySubmittedAsync(ProviderOnboardingAdminNotification notification, CancellationToken cancellationToken)
        {
            Sent.Add(notification);
            return Task.CompletedTask;
        }
    }

    private sealed class FailingProviderOnboardingAdminNotifier : IProviderOnboardingAdminNotifier
    {
        public int Attempts { get; private set; }

        public Task NotifySubmittedAsync(ProviderOnboardingAdminNotification notification, CancellationToken cancellationToken)
        {
            Attempts += 1;
            throw new InvalidOperationException("SES unavailable.");
        }
    }

    private sealed class RecordingProviderOnboardingSesClient : IProviderOnboardingSesClient
    {
        public List<ProviderOnboardingSesEmail> Sent { get; } = [];

        public Task SendEmailAsync(ProviderOnboardingSesEmail email, CancellationToken cancellationToken)
        {
            Sent.Add(email);
            return Task.CompletedTask;
        }
    }
}
