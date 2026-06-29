using Domain.Entities;

namespace Application.Interfaces;

/// <summary>Read-only access to the publicly visible content: featured experts, the provider directory, and visitor-flow questions.</summary>
public interface IPublicContentRepository
{
    Task<IReadOnlyList<ProviderProfile>> GetFeaturedExpertsAsync(int take, CancellationToken cancellationToken);

    Task<IReadOnlyList<ProviderProfile>> GetProvidersAsync(bool featuredOnly, int limit, CancellationToken cancellationToken);

    Task<IReadOnlyList<VisitorFlowQuestion>> GetVisitorFlowQuestionsAsync(string flowKey, int take, CancellationToken cancellationToken);
}
