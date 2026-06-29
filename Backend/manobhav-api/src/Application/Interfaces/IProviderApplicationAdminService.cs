using Application.DTOs;

namespace Application.Interfaces;

/// <summary>
/// Admin-side provider onboarding workflow: review, approve, reject (soft delete), status changes,
/// and public profile publish/unpublish. Owns the business rules; throws
/// <see cref="Application.Services.ProviderApplicationException"/> for non-success outcomes.
/// </summary>
public interface IProviderApplicationAdminService
{
    Task<IReadOnlyList<ProviderApplicationDto>> ListAsync(CancellationToken cancellationToken);

    Task<ProviderApplicationDto> GetAsync(Guid applicationId, CancellationToken cancellationToken);

    Task ApproveAsync(Guid applicationId, CancellationToken cancellationToken);

    Task<ProviderApplicationDto> SaveSectionReviewAsync(
        Guid applicationId,
        string sectionKey,
        ProviderApplicationSectionReviewRequest request,
        CancellationToken cancellationToken);

    Task NeedsChangesAsync(Guid applicationId, CancellationToken cancellationToken);

    Task RejectAsync(Guid applicationId, CancellationToken cancellationToken);

    Task SuspendAsync(Guid applicationId, CancellationToken cancellationToken);

    Task PublishProfileAsync(Guid providerProfileId, CancellationToken cancellationToken);

    Task UnpublishProfileAsync(Guid providerProfileId, CancellationToken cancellationToken);
}
