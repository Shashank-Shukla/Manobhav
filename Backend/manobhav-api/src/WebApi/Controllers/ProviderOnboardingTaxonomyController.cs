using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/provider-onboarding")]
public sealed class ProviderOnboardingTaxonomyController : ControllerBase
{
    private const string SpecializationsCategory = "specializations";
    private const string TherapyApproachesCategory = "therapyApproaches";
    private const string LanguagesCategory = "languages";
    private static readonly string[] KnownCategories =
    [
        SpecializationsCategory,
        TherapyApproachesCategory,
        LanguagesCategory
    ];

    private readonly ApplicationDbContext _db;

    public ProviderOnboardingTaxonomyController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("taxonomy")]
    [ProducesResponseType(typeof(ProviderOnboardingTaxonomyDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProviderOnboardingTaxonomyDto>> Get(CancellationToken cancellationToken = default)
    {
        var terms = await _db.ProviderTaxonomyTerms
            .AsNoTracking()
            .Where(term => term.IsActive && KnownCategories.Contains(term.Category))
            .OrderBy(term => term.DisplayOrder)
            .ThenBy(term => term.Label)
            .Select(term => new ProviderTaxonomyTerm
            {
                Category = term.Category,
                TermKey = term.TermKey,
                Label = term.Label,
                DisplayOrder = term.DisplayOrder
            })
            .ToListAsync(cancellationToken);

        return Ok(new ProviderOnboardingTaxonomyDto(
            SelectTerms(terms, SpecializationsCategory),
            SelectTerms(terms, TherapyApproachesCategory),
            SelectTerms(terms, LanguagesCategory)));
    }

    private static IReadOnlyList<ProviderTaxonomyOptionDto> SelectTerms(
        IEnumerable<ProviderTaxonomyTerm> terms,
        string category)
    {
        return terms
            .Where(term => string.Equals(term.Category, category, StringComparison.Ordinal))
            .Select(term => new ProviderTaxonomyOptionDto(term.TermKey, term.Label))
            .ToArray();
    }
}
