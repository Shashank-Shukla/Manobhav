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
        // Featured is a hard requirement: only providers explicitly flagged IsFeatured appear on the landing
        // page. Curating the featured set will become admin-configurable from the admin portal (item-10).
        return await _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => provider.IsActive && provider.IsFeatured && provider.VisibilityStatus == "Published")
            .OrderBy(provider => provider.DisplayOrder)
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
