using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class PublicContentRepository : IPublicContentRepository
{
    private readonly ApplicationDbContext _db;

    public PublicContentRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ProviderProfile>> GetFeaturedExpertsAsync(int take, CancellationToken cancellationToken)
    {
        // Surface any published, active provider on the landing page, with explicitly-featured providers
        // leading. Previously this hard-required IsFeatured, so the section silently disappeared whenever
        // no one had been flagged featured (the common case) even with plenty of published providers.
        return await _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => provider.IsActive && provider.VisibilityStatus == "Published")
            .OrderByDescending(provider => provider.IsFeatured)
            .ThenBy(provider => provider.DisplayOrder)
            .ThenBy(provider => provider.DisplayName ?? provider.Name)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProviderProfile>> GetProvidersAsync(bool featuredOnly, int limit, CancellationToken cancellationToken)
    {
        return await _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => provider.IsActive && provider.VisibilityStatus == "Published")
            .Where(provider => !featuredOnly || provider.IsFeatured)
            .OrderBy(provider => provider.DisplayOrder)
            .ThenBy(provider => provider.DisplayName ?? provider.Name)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<VisitorFlowQuestion>> GetVisitorFlowQuestionsAsync(string flowKey, int take, CancellationToken cancellationToken)
    {
        return await _db.VisitorFlowQuestions
            .AsNoTracking()
            .Where(question => question.FlowKey == flowKey && question.IsActive)
            .OrderBy(question => question.StepOrder)
            .Take(take)
            .ToListAsync(cancellationToken);
    }
}
