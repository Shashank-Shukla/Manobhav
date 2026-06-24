using Application.DTOs;
using Application.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/provider-onboarding/applications")]
public sealed class ProviderOnboardingController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ProviderOnboardingSectionService _sectionService;
    private readonly IProviderOnboardingAdminNotifier _adminNotifier;

    public ProviderOnboardingController(
        ApplicationDbContext db,
        ProviderOnboardingSectionService sectionService,
        IProviderOnboardingAdminNotifier adminNotifier)
    {
        _db = db;
        _sectionService = sectionService;
        _adminNotifier = adminNotifier;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> StartOrResume(CancellationToken cancellationToken)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Problem(title: "Authenticated user subject is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        await EnsureRoleAsync(user.Id, "ProviderApplicant", cancellationToken);
        var application = await _db.ProviderOnboardingApplications
            .FirstOrDefaultAsync(item => item.UserId == user.Id && item.Status != "Rejected", cancellationToken);

        if (application is null)
        {
            application = new ProviderOnboardingApplication
            {
                UserId = user.Id,
                Status = "Draft",
                CurrentStep = "basic-profile"
            };
            await _db.ProviderOnboardingApplications.AddAsync(application, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            return Created($"/api/provider-onboarding/applications/{application.Id}", ToDto(application));
        }

        return Ok(ToDto(application));
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        var application = await _db.ProviderOnboardingApplications
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstOrDefaultAsync(item => item.UserId == user.Id, cancellationToken);

        return application is null ? NotFound() : Ok(ToDto(application));
    }

    [HttpPut("{applicationId:guid}/sections/{sectionKey}")]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SaveSection(
        Guid applicationId,
        string sectionKey,
        SaveProviderSectionRequest request,
        CancellationToken cancellationToken)
    {
        var application = await GetOwnedApplicationAsync(applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        if (!string.Equals(application.Status, "Draft", StringComparison.Ordinal))
        {
            return Problem(
                title: "Provider application is not editable.",
                detail: $"Current status is {application.Status}.",
                statusCode: StatusCodes.Status409Conflict);
        }

        try
        {
            _sectionService.ApplySection(application, sectionKey, request);
        }
        catch (ProviderOnboardingValidationException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(application));
    }

    [HttpPost("{applicationId:guid}/submit")]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Submit(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await GetOwnedMutableApplicationAsync(applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        try
        {
            _sectionService.ValidateApplicationComplete(application);
        }
        catch (ProviderOnboardingValidationException exception)
        {
            return Problem(title: exception.Message, statusCode: StatusCodes.Status400BadRequest);
        }

        if (string.Equals(application.Status, "Submitted", StringComparison.Ordinal))
        {
            var existingNotificationFailure = await TryNotifySubmittedAsync(
                application,
                application.SubmittedAtUtc ?? application.UpdatedAtUtc ?? DateTimeOffset.UtcNow,
                cancellationToken);
            if (existingNotificationFailure is not null)
            {
                return existingNotificationFailure;
            }

            return Ok(ToDto(application));
        }

        var submittedAt = DateTimeOffset.UtcNow;
        var notificationFailure = await TryNotifySubmittedAsync(application, submittedAt, cancellationToken);
        if (notificationFailure is not null)
        {
            return notificationFailure;
        }

        application.Status = "Submitted";
        application.SubmittedAtUtc = submittedAt;
        application.UpdatedAtUtc = submittedAt;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(application));
    }

    [HttpPost("{applicationId:guid}/documents/presigned-upload")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status501NotImplemented)]
    public IActionResult CreatePresignedUpload(Guid applicationId, ProviderDocumentUploadRequest request)
    {
        return Problem(
            title: "Private S3 pre-signed upload generation is not configured in this build.",
            detail: "Add an approved S3 upload service with AWS SDK configuration before enabling provider document uploads.",
            statusCode: StatusCodes.Status501NotImplemented);
    }

    [HttpPost("{applicationId:guid}/documents/{documentId:guid}/complete")]
    [ProducesResponseType(typeof(ProviderDocumentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CompleteDocument(Guid applicationId, Guid documentId, CancellationToken cancellationToken)
    {
        var application = await GetOwnedMutableApplicationAsync(applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        var document = await _db.ProviderDocuments
            .FirstOrDefaultAsync(item => item.Id == documentId && item.ProviderApplicationId == applicationId, cancellationToken);
        if (document is null)
        {
            return NotFound();
        }

        document.Status = "PendingReview";
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(new ProviderDocumentDto(document.Id, document.ProviderApplicationId, document.Category, document.Status, document.S3Key));
    }

    private async Task<ProviderOnboardingApplication?> GetOwnedMutableApplicationAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await GetOwnedApplicationAsync(applicationId, cancellationToken);
        return application is not null &&
            application.Status != "Approved" &&
            application.Status != "Suspended"
            ? application
            : null;
    }

    private async Task<ProviderOnboardingApplication?> GetOwnedApplicationAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return null;
        }

        return await _db.ProviderOnboardingApplications
            .FirstOrDefaultAsync(item =>
                item.Id == applicationId &&
                item.UserId == user.Id,
                cancellationToken);
    }

    private async Task<User?> EnsureCurrentUserAsync(CancellationToken cancellationToken)
    {
        var subject = User.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(subject))
        {
            return null;
        }

        var user = await _db.Users.FirstOrDefaultAsync(item => item.CognitoSubject == subject, cancellationToken);
        if (user is not null)
        {
            return user;
        }

        user = new User
        {
            CognitoSubject = subject,
            Email = User.FindFirst("email")?.Value,
            DisplayName = User.Identity?.Name
        };
        await _db.Users.AddAsync(user, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return user;
    }

    private async Task EnsureRoleAsync(Guid userId, string role, CancellationToken cancellationToken)
    {
        var exists = await _db.UserRoles.AnyAsync(item => item.UserId == userId && item.Role == role && item.IsActive, cancellationToken);
        if (exists)
        {
            return;
        }

        await _db.UserRoles.AddAsync(new UserRole { UserId = userId, Role = role }, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static ProviderApplicationDto ToDto(ProviderOnboardingApplication application)
    {
        return new ProviderApplicationDto(
            application.Id,
            application.UserId,
            application.Status,
            application.CurrentStep,
            application.CreatedAtUtc,
            application.UpdatedAtUtc,
            application.SubmittedAtUtc,
            ProviderOnboardingSectionCatalog.BuildReviewSections(application));
    }

    private async Task<IActionResult?> TryNotifySubmittedAsync(
        ProviderOnboardingApplication application,
        DateTimeOffset submittedAt,
        CancellationToken cancellationToken)
    {
        try
        {
            await _adminNotifier.NotifySubmittedAsync(ToAdminNotification(application, submittedAt), cancellationToken);
            return null;
        }
        catch (Exception)
        {
            return Problem(
                title: "Provider application was not sent for admin review.",
                detail: "The admin email notification could not be sent. Please try again.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }

    private static ProviderOnboardingAdminNotification ToAdminNotification(
        ProviderOnboardingApplication application,
        DateTimeOffset submittedAt)
    {
        var sections = ProviderOnboardingSectionCatalog.BuildReviewSections(application);
        var basicIdentity = sections.GetValueOrDefault("basicIdentity");
        var displayName = ReadOptionalString(basicIdentity, "displayName") ??
            ReadOptionalString(basicIdentity, "legalName") ??
            "Provider applicant";

        return new ProviderOnboardingAdminNotification(
            application.Id,
            application.UserId,
            displayName,
            submittedAt);
    }

    private static string? ReadOptionalString(JsonElement element, string propertyName)
    {
        return element.ValueKind == JsonValueKind.Object &&
            element.TryGetProperty(propertyName, out var property) &&
            property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : null;
    }
}
