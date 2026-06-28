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
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/provider-applications")]
public sealed class AdminProviderController : ControllerBase
{
    private const string SubmittedStatus = "Submitted";
    private const string ApprovedStatus = "Approved";
    private const string RejectedStatus = "Rejected";
    private const string ProviderRole = "Provider";
    private const string ProviderApplicantRole = "ProviderApplicant";

    private readonly ApplicationDbContext _db;

    public AdminProviderController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProviderApplicationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProviderApplicationDto>>> List(CancellationToken cancellationToken)
    {
        var applications = await _db.ProviderOnboardingApplications
            .Include(application => application.SectionReviews)
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAtUtc)
            .Take(100)
            .ToListAsync(cancellationToken);
        return Ok(applications.Select(ToDetailDto).ToList());
    }

    [HttpGet("{applicationId:guid}")]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProviderApplicationDto>> Get(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _db.ProviderOnboardingApplications
            .Include(item => item.SectionReviews)
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        return Ok(ToDetailDto(application));
    }

    [HttpPost("{applicationId:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Approve(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _db.ProviderOnboardingApplications
            .Include(item => item.SectionReviews)
            .FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        if (!string.Equals(application.Status, SubmittedStatus, StringComparison.Ordinal))
        {
            return ProviderApplicationStatusConflict(application);
        }

        var sections = ProviderOnboardingSectionCatalog.BuildReviewSections(application);
        var missingSections = ProviderOnboardingSectionCatalog.GetMissingRequiredReviewSectionKeys(sections);
        if (missingSections.Count > 0)
        {
            return Problem(
                title: "Provider application must include every required review section before final approval.",
                detail: $"Missing required sections: {string.Join(", ", missingSections)}.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (!AllRequiredSectionsApproved(application))
        {
            return Problem(
                title: "Every required provider application section must be approved before final approval.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var now = DateTimeOffset.UtcNow;
        application.Status = ApprovedStatus;
        application.ApprovedAtUtc = now;
        application.ReviewedAtUtc = now;
        application.UpdatedAtUtc = now;
        await EnsureRoleAsync(application.UserId, ProviderRole, cancellationToken);
        await MaterializeProviderProfileAsync(application, now, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Creates the provider's roster record on approval. Approval publishes the provider so they are
    /// immediately active and visible to patients on the public directory (the public /providers feed
    /// requires <c>IsActive</c> and <c>VisibilityStatus == "Published"</c>). If a profile already
    /// exists it is (re)published, which also covers re-approving a previously hidden provider.
    /// </summary>
    private async Task MaterializeProviderProfileAsync(
        ProviderOnboardingApplication application,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var existing = await _db.ProviderProfiles
            .FirstOrDefaultAsync(profile => profile.ProviderApplicationId == application.Id, cancellationToken);
        if (existing is not null)
        {
            ApplyOnboardingProfileData(existing, application);
            PublishProfile(existing, now);
            return;
        }

        var profile = new ProviderProfile
        {
            ProviderApplicationId = application.Id,
            UserId = application.UserId,
            Role = "Therapist",
            VisibilityStatus = "Published",
            IsActive = true,
            CreatedAtUtc = now,
            PublishedAtUtc = now,
        };
        ApplyOnboardingProfileData(profile, application);
        await _db.ProviderProfiles.AddAsync(profile, cancellationToken);
    }

    /// <summary>
    /// Copies the provider's submitted onboarding details — name, short/long bio, focus areas,
    /// languages, location and recurring weekly availability — from the application's section JSON
    /// blobs onto the materialized <see cref="ProviderProfile"/>. Without this the public directory
    /// renders an empty card even though the application captured everything. It runs on first
    /// approval and on every re-approval, so an edited-and-resubmitted application republishes with
    /// fresh data.
    /// </summary>
    private static void ApplyOnboardingProfileData(ProviderProfile profile, ProviderOnboardingApplication application)
    {
        var (displayName, legalName) = ReadApplicationNames(application);
        profile.Name = FirstNonEmpty(displayName, legalName) ?? "Provider";
        profile.DisplayName = FirstNonEmpty(displayName, legalName);

        var basic = ReadSection<ProviderBasicIdentitySection>(application.BasicProfileJson, nestedProperty: null);
        if (!string.IsNullOrWhiteSpace(basic?.Location))
        {
            profile.Location = basic!.Location!.Trim();
        }

        var bio = ReadSection<ProviderBioSection>(application.BioJson, "bio");
        profile.Summary = Clamp(bio?.ShortBio, 512);
        profile.LongDescription = Clamp(bio?.LongBio, 2000);
        profile.Bio = string.IsNullOrWhiteSpace(bio?.LongBio) ? null : Clamp(bio!.LongBio, 2000);
        profile.LanguagesJson = SerializeStrings(bio?.Languages);

        var specializations = ReadSection<ProviderSpecializationsSection>(application.BioJson, "specializations");
        profile.SpecializationsJson = SerializeStrings(specializations?.FocusAreas);

        var sessionDetails = ReadSection<ProviderSessionDetailsSection>(application.SessionDetailsJson, "sessionDetails");
        profile.WeeklyAvailabilityJson = SerializeWeeklyAvailability(sessionDetails?.AvailabilitySlots);
    }

    private static readonly JsonSerializerOptions OnboardingJsonOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Deserializes a typed section from a section JSON blob. When <paramref name="nestedProperty"/>
    /// is supplied the section lives under that key (e.g. <c>BioJson.bio</c>); otherwise the whole
    /// document is the section (e.g. <c>BasicProfileJson</c>). Returns null on any malformed input.
    /// </summary>
    private static T? ReadSection<T>(string json, string? nestedProperty) where T : class
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            if (nestedProperty is null)
            {
                return JsonSerializer.Deserialize<T>(json, OnboardingJsonOptions);
            }

            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                !document.RootElement.TryGetProperty(nestedProperty, out var nested))
            {
                return null;
            }

            return nested.Deserialize<T>(OnboardingJsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string Clamp(string? value, int maxLength)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string SerializeStrings(IReadOnlyList<string>? values)
    {
        var cleaned = (values ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .ToList();
        return JsonSerializer.Serialize(cleaned);
    }

    /// <summary>
    /// Normalizes the onboarding weekly slots into the directory's wire shape
    /// (<c>{ dayOfWeek, startTime, endTime }</c>, dayOfWeek 0=Sunday..6=Saturday), dropping any
    /// entry whose times aren't 24-hour "HH:mm". This JSON is read verbatim by the public API.
    /// </summary>
    private static string SerializeWeeklyAvailability(IReadOnlyList<AvailabilitySlotDto>? slots)
    {
        var cleaned = (slots ?? [])
            .Where(slot => slot is not null && IsTimeOfDay(slot.StartTime) && IsTimeOfDay(slot.EndTime))
            .Select(slot => new
            {
                dayOfWeek = ((slot.DayOfWeek % 7) + 7) % 7,
                startTime = slot.StartTime,
                endTime = slot.EndTime,
            })
            .ToList();
        return JsonSerializer.Serialize(cleaned);
    }

    private static bool IsTimeOfDay(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length != 5 || value[2] != ':')
        {
            return value == "24:00";
        }

        return int.TryParse(value[..2], out var hours) && hours is >= 0 and <= 23 &&
            int.TryParse(value[3..], out var minutes) && minutes is >= 0 and <= 59;
    }

    private static void PublishProfile(ProviderProfile profile, DateTimeOffset now)
    {
        profile.IsActive = true;
        profile.VisibilityStatus = "Published";
        profile.PublishedAtUtc = now;
        profile.UpdatedAtUtc = now;
    }

    private static (string? DisplayName, string? LegalName) ReadApplicationNames(ProviderOnboardingApplication application)
    {
        try
        {
            using var document = JsonDocument.Parse(application.BasicProfileJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return (null, null);
            }

            return (ReadStringProperty(document.RootElement, "displayName"), ReadStringProperty(document.RootElement, "legalName"));
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }

    private static string? ReadStringProperty(JsonElement element, string name)
    {
        return element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private static string? FirstNonEmpty(params string?[] candidates)
    {
        return candidates.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    [HttpPut("{applicationId:guid}/sections/{sectionKey}/review")]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProviderApplicationDto>> SaveSectionReview(
        Guid applicationId,
        string sectionKey,
        ProviderApplicationSectionReviewRequest request,
        CancellationToken cancellationToken)
    {
        var application = await _db.ProviderOnboardingApplications
            .Include(item => item.SectionReviews)
            .FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        if (!string.Equals(application.Status, SubmittedStatus, StringComparison.Ordinal))
        {
            return ProviderApplicationStatusConflict(application);
        }

        var sections = ProviderOnboardingSectionCatalog.BuildReviewSections(application);
        if (!ProviderOnboardingSectionCatalog.IsRequiredReviewSectionKey(sectionKey) || !sections.ContainsKey(sectionKey))
        {
            return Problem(
                title: "Provider application section is not available for review.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var status = NormalizeSectionReviewStatus(request.Status);
        if (status is null)
        {
            return Problem(
                title: "Section review status must be Approved or Rejected.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var comment = NormalizeSectionReviewComment(request.Comment);
        if (comment?.Length > ProviderApplicationSectionReviewRequest.MaxCommentLength)
        {
            return Problem(
                title: $"Section review comment must be {ProviderApplicationSectionReviewRequest.MaxCommentLength} characters or fewer.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (string.Equals(status, RejectedStatus, StringComparison.Ordinal) && comment is null)
        {
            return Problem(
                title: "Rejected provider application sections require a review comment.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var now = DateTimeOffset.UtcNow;
        var review = application.SectionReviews.FirstOrDefault(item => string.Equals(item.SectionKey, sectionKey, StringComparison.Ordinal));
        var createdReview = review is null;
        if (review is null)
        {
            review = new ProviderApplicationSectionReview
            {
                ProviderApplicationId = application.Id,
                SectionKey = sectionKey,
                CreatedAtUtc = now
            };
            _db.ProviderApplicationSectionReviews.Add(review);
        }

        review.Status = status;
        review.Comment = comment;
        review.ReviewedAtUtc = now;
        review.UpdatedAtUtc = review.CreatedAtUtc == now ? null : now;
        application.UpdatedAtUtc = now;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (createdReview)
        {
            await SaveSectionReviewAfterConcurrentInsertAsync(application, review, status, comment, now, cancellationToken);
        }

        var updatedApplication = await LoadApplicationForDetailAsync(applicationId, cancellationToken);
        return Ok(ToDetailDto(updatedApplication));
    }

    [HttpPost("{applicationId:guid}/needs-changes")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> NeedsChanges(Guid applicationId, CancellationToken cancellationToken)
    {
        return await SetStatusAsync(applicationId, "NeedsChanges", cancellationToken);
    }

    [HttpPost("{applicationId:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reject(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _db.ProviderOnboardingApplications
            .FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        // Rejecting is allowed for any application that isn't already rejected — this covers both
        // declining a pending application and revoking a previously approved provider.
        if (string.Equals(application.Status, RejectedStatus, StringComparison.Ordinal))
        {
            return ProviderApplicationStatusConflict(application);
        }

        var now = DateTimeOffset.UtcNow;
        application.Status = RejectedStatus;
        application.ReviewedAtUtc = now;
        application.UpdatedAtUtc = now;
        application.RejectedAtUtc = now;
        await SoftDeleteProviderAsync(application, now, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Soft-deletes the materialized provider and its activities when an application is rejected.
    /// Nothing is hard-deleted: the profile is deactivated and hidden from the public directory,
    /// scheduled appointments are cancelled, and provider roles are deactivated, so every record
    /// stays auditable and reversible.
    /// </summary>
    private async Task SoftDeleteProviderAsync(
        ProviderOnboardingApplication application,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var profile = await _db.ProviderProfiles
            .FirstOrDefaultAsync(item => item.ProviderApplicationId == application.Id, cancellationToken);
        if (profile is not null)
        {
            profile.IsActive = false;
            profile.VisibilityStatus = "Hidden";
            profile.UnpublishedAtUtc = now;
            profile.UpdatedAtUtc = now;

            var scheduledAppointments = await _db.Appointments
                .Where(appointment => appointment.ProviderProfileId == profile.Id && appointment.Status == "Scheduled")
                .ToListAsync(cancellationToken);
            foreach (var appointment in scheduledAppointments)
            {
                appointment.Status = "Cancelled";
                appointment.CancelledAtUtc = now;
                appointment.UpdatedAtUtc = now;
            }
        }

        var providerRoles = await _db.UserRoles
            .Where(role => role.UserId == application.UserId && role.IsActive &&
                (role.Role == ProviderRole || role.Role == ProviderApplicantRole))
            .ToListAsync(cancellationToken);
        foreach (var role in providerRoles)
        {
            role.IsActive = false;
        }
    }

    [HttpPost("{applicationId:guid}/suspend")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Suspend(Guid applicationId, CancellationToken cancellationToken)
    {
        return await SetStatusAsync(applicationId, "Suspended", cancellationToken);
    }

    [HttpPost("/api/admin/provider-profiles/{providerProfileId:guid}/publish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Publish(Guid providerProfileId, CancellationToken cancellationToken)
    {
        return await SetProfileVisibilityAsync(providerProfileId, "Published", cancellationToken);
    }

    [HttpPost("/api/admin/provider-profiles/{providerProfileId:guid}/unpublish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unpublish(Guid providerProfileId, CancellationToken cancellationToken)
    {
        return await SetProfileVisibilityAsync(providerProfileId, "Unpublished", cancellationToken);
    }

    private async Task<IActionResult> SetStatusAsync(Guid applicationId, string status, CancellationToken cancellationToken)
    {
        var application = await _db.ProviderOnboardingApplications.FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        application.Status = status;
        application.ReviewedAtUtc = DateTimeOffset.UtcNow;
        application.UpdatedAtUtc = DateTimeOffset.UtcNow;
        if (status == "Rejected")
        {
            application.RejectedAtUtc = DateTimeOffset.UtcNow;
        }
        if (status == "Suspended")
        {
            application.SuspendedAtUtc = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<IActionResult> SetProfileVisibilityAsync(Guid providerProfileId, string visibility, CancellationToken cancellationToken)
    {
        var profile = await _db.ProviderProfiles.FirstOrDefaultAsync(item => item.Id == providerProfileId, cancellationToken);
        if (profile is null)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        if (string.Equals(visibility, "Published", StringComparison.Ordinal))
        {
            // Publishing re-syncs the public profile from the latest onboarding application and
            // reactivates it. This also backfills providers that were approved before their details
            // were materialized onto the profile (re-publish to refresh an empty card).
            if (profile.ProviderApplicationId is { } applicationId)
            {
                var application = await _db.ProviderOnboardingApplications
                    .FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
                if (application is not null)
                {
                    ApplyOnboardingProfileData(profile, application);
                }
            }

            profile.IsActive = true;
            profile.PublishedAtUtc = now;
        }
        else if (string.Equals(visibility, "Unpublished", StringComparison.Ordinal))
        {
            profile.UnpublishedAtUtc = now;
        }

        profile.VisibilityStatus = visibility;
        profile.UpdatedAtUtc = now;
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task EnsureRoleAsync(Guid userId, string role, CancellationToken cancellationToken)
    {
        var exists = await _db.UserRoles.AnyAsync(item => item.UserId == userId && item.Role == role && item.IsActive, cancellationToken);
        if (!exists)
        {
            await _db.UserRoles.AddAsync(new UserRole { UserId = userId, Role = role }, cancellationToken);
        }
    }

    private static ProviderApplicationDto ToDetailDto(ProviderOnboardingApplication application)
    {
        var sections = ProviderOnboardingSectionCatalog.BuildReviewSections(application);
        return new ProviderApplicationDto(
            application.Id,
            application.UserId,
            application.Status,
            application.CurrentStep,
            application.CreatedAtUtc,
            application.UpdatedAtUtc,
            application.SubmittedAtUtc,
            sections,
            BuildSectionReviews(application, sections));
    }

    private static IReadOnlyDictionary<string, ProviderApplicationSectionReviewDto> BuildSectionReviews(
        ProviderOnboardingApplication application,
        IReadOnlyDictionary<string, JsonElement> sections)
    {
        var sectionKeys = new HashSet<string>(sections.Keys, StringComparer.Ordinal);
        return application.SectionReviews
            .Where(review => sectionKeys.Contains(review.SectionKey))
            .ToDictionary(
                review => review.SectionKey,
                review => new ProviderApplicationSectionReviewDto(
                    review.Id,
                    review.SectionKey,
                    review.Status,
                    review.Comment,
                    review.ReviewedAtUtc),
                StringComparer.Ordinal);
    }

    private static bool AllRequiredSectionsApproved(ProviderOnboardingApplication application)
    {
        var approvedSectionKeys = application.SectionReviews
            .Where(review => string.Equals(review.Status, ApprovedStatus, StringComparison.Ordinal))
            .Select(review => review.SectionKey)
            .ToHashSet(StringComparer.Ordinal);

        return ProviderOnboardingSectionCatalog.RequiredReviewSectionKeys.All(approvedSectionKeys.Contains);
    }

    private static string? NormalizeSectionReviewStatus(string? status)
    {
        return status?.Trim() switch
        {
            ApprovedStatus => ApprovedStatus,
            RejectedStatus => RejectedStatus,
            _ => null
        };
    }

    private static string? NormalizeSectionReviewComment(string? comment)
    {
        var trimmed = comment?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private ObjectResult ProviderApplicationStatusConflict(ProviderOnboardingApplication application)
    {
        return Problem(
            title: "Provider application is not open for admin review.",
            detail: $"Current status is {application.Status}.",
            statusCode: StatusCodes.Status409Conflict);
    }

    private async Task SaveSectionReviewAfterConcurrentInsertAsync(
        ProviderOnboardingApplication application,
        ProviderApplicationSectionReview insertedReview,
        string status,
        string? comment,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        _db.Entry(insertedReview).State = EntityState.Detached;
        var existingReview = await _db.ProviderApplicationSectionReviews
            .FirstOrDefaultAsync(
                item => item.ProviderApplicationId == application.Id &&
                    item.SectionKey == insertedReview.SectionKey,
                cancellationToken);
        if (existingReview is null)
        {
            throw new DbUpdateException("Concurrent provider application section review insert could not be resolved.");
        }

        existingReview.Status = status;
        existingReview.Comment = comment;
        existingReview.ReviewedAtUtc = now;
        existingReview.UpdatedAtUtc = now;
        application.UpdatedAtUtc = now;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<ProviderOnboardingApplication> LoadApplicationForDetailAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        return await _db.ProviderOnboardingApplications
            .Include(item => item.SectionReviews)
            .AsNoTracking()
            .FirstAsync(item => item.Id == applicationId, cancellationToken);
    }
}
