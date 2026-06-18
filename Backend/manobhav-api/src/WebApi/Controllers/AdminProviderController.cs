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
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
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

        if (!HasRejectedRequiredSectionWithComment(application))
        {
            return Problem(
                title: "At least one provider application section must be rejected with a comment before final rejection.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var now = DateTimeOffset.UtcNow;
        application.Status = RejectedStatus;
        application.ReviewedAtUtc = now;
        application.UpdatedAtUtc = now;
        application.RejectedAtUtc = now;
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
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

        profile.VisibilityStatus = visibility;
        profile.PublishedAtUtc = visibility == "Published" ? DateTimeOffset.UtcNow : profile.PublishedAtUtc;
        profile.UnpublishedAtUtc = visibility == "Unpublished" ? DateTimeOffset.UtcNow : profile.UnpublishedAtUtc;
        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;
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

    private static bool HasRejectedRequiredSectionWithComment(ProviderOnboardingApplication application)
    {
        return application.SectionReviews.Any(review =>
            ProviderOnboardingSectionCatalog.IsRequiredReviewSectionKey(review.SectionKey) &&
            string.Equals(review.Status, RejectedStatus, StringComparison.Ordinal) &&
            !string.IsNullOrWhiteSpace(review.Comment));
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
