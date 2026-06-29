using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;

namespace Application.Services;

public sealed class ProviderApplicationAdminService : IProviderApplicationAdminService
{
    private const string SubmittedStatus = "Submitted";
    private const string ApprovedStatus = "Approved";
    private const string RejectedStatus = "Rejected";
    private const string ProviderRole = "Provider";
    private const string ProviderApplicantRole = "ProviderApplicant";
    private const int ListLimit = 100;

    private static readonly string[] ProviderRoleNames = [ProviderRole, ProviderApplicantRole];

    private readonly IProviderApplicationRepository _repository;
    private readonly ProviderProfileMaterializer _materializer;

    public ProviderApplicationAdminService(IProviderApplicationRepository repository, ProviderProfileMaterializer materializer)
    {
        _repository = repository;
        _materializer = materializer;
    }

    public async Task<IReadOnlyList<ProviderApplicationDto>> ListAsync(CancellationToken cancellationToken)
    {
        var applications = await _repository.ListApplicationsAsync(ListLimit, cancellationToken);
        return applications.Select(ToDetailDto).ToList();
    }

    public async Task<ProviderApplicationDto> GetAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _repository.GetApplicationAsync(applicationId, tracked: false, cancellationToken)
            ?? throw new ProviderApplicationNotFoundException();
        return ToDetailDto(application);
    }

    public async Task ApproveAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _repository.GetApplicationAsync(applicationId, tracked: true, cancellationToken)
            ?? throw new ProviderApplicationNotFoundException();

        if (!string.Equals(application.Status, SubmittedStatus, StringComparison.Ordinal))
        {
            throw StatusConflict(application);
        }

        var sections = ProviderOnboardingSectionCatalog.BuildReviewSections(application);
        var missingSections = ProviderOnboardingSectionCatalog.GetMissingRequiredReviewSectionKeys(sections);
        if (missingSections.Count > 0)
        {
            throw new ProviderApplicationValidationException(
                "Provider application must include every required review section before final approval.",
                $"Missing required sections: {string.Join(", ", missingSections)}.");
        }

        if (!AllRequiredSectionsApproved(application))
        {
            throw new ProviderApplicationValidationException(
                "Every required provider application section must be approved before final approval.");
        }

        var now = DateTimeOffset.UtcNow;
        application.Status = ApprovedStatus;
        application.ApprovedAtUtc = now;
        application.ReviewedAtUtc = now;
        application.UpdatedAtUtc = now;
        await EnsureRoleAsync(application.UserId, ProviderRole, cancellationToken);
        await MaterializeProviderProfileAsync(application, now, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
    }

    public async Task<ProviderApplicationDto> SaveSectionReviewAsync(
        Guid applicationId,
        string sectionKey,
        ProviderApplicationSectionReviewRequest request,
        CancellationToken cancellationToken)
    {
        var application = await _repository.GetApplicationAsync(applicationId, tracked: true, cancellationToken)
            ?? throw new ProviderApplicationNotFoundException();

        if (!string.Equals(application.Status, SubmittedStatus, StringComparison.Ordinal))
        {
            throw StatusConflict(application);
        }

        var sections = ProviderOnboardingSectionCatalog.BuildReviewSections(application);
        if (!ProviderOnboardingSectionCatalog.IsRequiredReviewSectionKey(sectionKey) || !sections.ContainsKey(sectionKey))
        {
            throw new ProviderApplicationValidationException("Provider application section is not available for review.");
        }

        var status = NormalizeSectionReviewStatus(request.Status)
            ?? throw new ProviderApplicationValidationException("Section review status must be Approved or Rejected.");

        var comment = NormalizeSectionReviewComment(request.Comment);
        if (comment?.Length > ProviderApplicationSectionReviewRequest.MaxCommentLength)
        {
            throw new ProviderApplicationValidationException(
                $"Section review comment must be {ProviderApplicationSectionReviewRequest.MaxCommentLength} characters or fewer.");
        }

        if (string.Equals(status, RejectedStatus, StringComparison.Ordinal) && comment is null)
        {
            throw new ProviderApplicationValidationException("Rejected provider application sections require a review comment.");
        }

        await _repository.UpsertSectionReviewAsync(application, sectionKey, status, comment, DateTimeOffset.UtcNow, cancellationToken);

        var updated = await _repository.GetApplicationAsync(applicationId, tracked: false, cancellationToken)
            ?? throw new ProviderApplicationNotFoundException();
        return ToDetailDto(updated);
    }

    public Task NeedsChangesAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        return SetStatusAsync(applicationId, "NeedsChanges", cancellationToken);
    }

    public async Task RejectAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _repository.GetApplicationAsync(applicationId, tracked: true, cancellationToken)
            ?? throw new ProviderApplicationNotFoundException();

        // Rejecting is allowed for any application that isn't already rejected — this covers both
        // declining a pending application and revoking a previously approved provider.
        if (string.Equals(application.Status, RejectedStatus, StringComparison.Ordinal))
        {
            throw StatusConflict(application);
        }

        var now = DateTimeOffset.UtcNow;
        application.Status = RejectedStatus;
        application.ReviewedAtUtc = now;
        application.UpdatedAtUtc = now;
        application.RejectedAtUtc = now;
        await SoftDeleteProviderAsync(application, now, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
    }

    public Task SuspendAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        return SetStatusAsync(applicationId, "Suspended", cancellationToken);
    }

    public Task PublishProfileAsync(Guid providerProfileId, CancellationToken cancellationToken)
    {
        return SetProfileVisibilityAsync(providerProfileId, "Published", cancellationToken);
    }

    public Task UnpublishProfileAsync(Guid providerProfileId, CancellationToken cancellationToken)
    {
        return SetProfileVisibilityAsync(providerProfileId, "Unpublished", cancellationToken);
    }

    /// <summary>
    /// Creates the provider's roster record on approval, or (re)publishes and refreshes an existing
    /// one. Approval publishes the provider so they are immediately active and visible to patients on
    /// the public directory.
    /// </summary>
    private async Task MaterializeProviderProfileAsync(
        ProviderOnboardingApplication application,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var existing = await _repository.GetProfileByApplicationIdAsync(application.Id, cancellationToken);
        if (existing is not null)
        {
            _materializer.Apply(existing, application);
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
        _materializer.Apply(profile, application);
        await _repository.AddProfileAsync(profile, cancellationToken);
    }

    /// <summary>
    /// Soft-deletes the materialized provider and its activities when an application is rejected.
    /// Nothing is hard-deleted: the profile is deactivated and hidden, scheduled appointments are
    /// cancelled, and provider roles are deactivated, so every record stays auditable and reversible.
    /// </summary>
    private async Task SoftDeleteProviderAsync(
        ProviderOnboardingApplication application,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var profile = await _repository.GetProfileByApplicationIdAsync(application.Id, cancellationToken);
        if (profile is not null)
        {
            profile.IsActive = false;
            profile.VisibilityStatus = "Hidden";
            profile.UnpublishedAtUtc = now;
            profile.UpdatedAtUtc = now;

            var scheduledAppointments = await _repository.GetScheduledAppointmentsAsync(profile.Id, cancellationToken);
            foreach (var appointment in scheduledAppointments)
            {
                appointment.Status = "Cancelled";
                appointment.CancelledAtUtc = now;
                appointment.UpdatedAtUtc = now;
            }
        }

        var providerRoles = await _repository.GetActiveProviderRolesAsync(application.UserId, ProviderRoleNames, cancellationToken);
        foreach (var role in providerRoles)
        {
            role.IsActive = false;
        }
    }

    private async Task SetStatusAsync(Guid applicationId, string status, CancellationToken cancellationToken)
    {
        var application = await _repository.GetApplicationAsync(applicationId, tracked: true, cancellationToken)
            ?? throw new ProviderApplicationNotFoundException();

        var now = DateTimeOffset.UtcNow;
        application.Status = status;
        application.ReviewedAtUtc = now;
        application.UpdatedAtUtc = now;
        if (string.Equals(status, RejectedStatus, StringComparison.Ordinal))
        {
            application.RejectedAtUtc = now;
        }

        if (string.Equals(status, "Suspended", StringComparison.Ordinal))
        {
            application.SuspendedAtUtc = now;
        }

        await _repository.SaveChangesAsync(cancellationToken);
    }

    private async Task SetProfileVisibilityAsync(Guid providerProfileId, string visibility, CancellationToken cancellationToken)
    {
        var profile = await _repository.GetProfileByIdAsync(providerProfileId, cancellationToken)
            ?? throw new ProviderApplicationNotFoundException();

        var now = DateTimeOffset.UtcNow;
        if (string.Equals(visibility, "Published", StringComparison.Ordinal))
        {
            // Publishing re-syncs the public profile from the latest onboarding application and
            // reactivates it, which also backfills providers approved before their details were
            // materialized onto the profile.
            if (profile.ProviderApplicationId is { } applicationId)
            {
                var application = await _repository.GetApplicationAsync(applicationId, tracked: false, cancellationToken);
                if (application is not null)
                {
                    _materializer.Apply(profile, application);
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
        await _repository.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureRoleAsync(Guid userId, string role, CancellationToken cancellationToken)
    {
        if (!await _repository.ActiveRoleExistsAsync(userId, role, cancellationToken))
        {
            await _repository.AddRoleAsync(new UserRole { UserId = userId, Role = role }, cancellationToken);
        }
    }

    private static void PublishProfile(ProviderProfile profile, DateTimeOffset now)
    {
        profile.IsActive = true;
        profile.VisibilityStatus = "Published";
        profile.PublishedAtUtc = now;
        profile.UpdatedAtUtc = now;
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
            _ => null,
        };
    }

    private static string? NormalizeSectionReviewComment(string? comment)
    {
        var trimmed = comment?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static ProviderApplicationConflictException StatusConflict(ProviderOnboardingApplication application)
    {
        return new ProviderApplicationConflictException(
            "Provider application is not open for admin review.",
            $"Current status is {application.Status}.");
    }
}
