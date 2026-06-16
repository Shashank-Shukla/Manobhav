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
using WebApi.Controllers;

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

    [Fact]
    public async Task Submit_MarksDraftAsSubmitted()
    {
        await using var db = CreateDbContext();
        var user = await AddUserAsync(db);
        var application = await AddApplicationAsync(db, user.Id);
        var controller = CreateProviderController(db);

        var result = await controller.Submit(application.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ProviderApplicationDto>(ok.Value);
        Assert.Equal("Submitted", dto.Status);
        Assert.NotNull(dto.SubmittedAtUtc);
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

    private static ProviderOnboardingController CreateProviderController(ApplicationDbContext db)
    {
        var controller = new ProviderOnboardingController(db, new ProviderOnboardingSectionService())
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

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }
}
