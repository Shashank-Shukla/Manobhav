using Application.DTOs;

namespace Application.Interfaces;

/// <summary>Builds the publicly visible content responses (landing experts, provider directory, visitor flow).</summary>
public interface IPublicContentService
{
    Task<LandingContentResponse> GetLandingAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<ProviderDirectoryItemDto>> GetProvidersAsync(bool featured, int limit, CancellationToken cancellationToken);

    Task<VisitorFlowResponse> GetVisitorFlowAsync(string flowKey, CancellationToken cancellationToken);
}
