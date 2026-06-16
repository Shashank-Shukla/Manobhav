using System.Text.Json;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public")]
public sealed class PublicContentController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PublicContentController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("landing")]
    [ProducesResponseType(typeof(LandingContentResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<LandingContentResponse>> GetLanding(CancellationToken cancellationToken)
    {
        var experts = await _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => provider.IsActive && provider.IsFeatured && provider.VisibilityStatus == "Published")
            .OrderBy(provider => provider.DisplayOrder)
            .ThenBy(provider => provider.DisplayName ?? provider.Name)
            .Take(4)
            .Select(provider => new FeaturedExpertDto(
                provider.Id,
                provider.DisplayName ?? provider.Name,
                provider.ProfessionalTitle ?? provider.Role,
                "Availability managed by API"))
            .ToListAsync(cancellationToken);

        return Ok(new LandingContentResponse(experts));
    }

    [HttpGet("visitor-flow")]
    [ProducesResponseType(typeof(VisitorFlowResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<VisitorFlowResponse>> GetVisitorFlow([FromQuery] string flowKey = "default", CancellationToken cancellationToken = default)
    {
        var questions = await _db.VisitorFlowQuestions
            .AsNoTracking()
            .Where(question => question.FlowKey == flowKey && question.IsActive)
            .OrderBy(question => question.StepOrder)
            .Take(50)
            .Select(question => new VisitorFlowQuestionDto(question.Id, question.StepOrder, question.Text))
            .ToListAsync(cancellationToken);

        return Ok(new VisitorFlowResponse(flowKey, questions));
    }

    [HttpGet("providers")]
    [ProducesResponseType(typeof(IReadOnlyList<ProviderDirectoryItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProviderDirectoryItemDto>>> GetProviders(
        [FromQuery] bool featured = false,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 100);
        var providers = await _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => provider.IsActive && provider.VisibilityStatus == "Published")
            .Where(provider => !featured || provider.IsFeatured)
            .OrderBy(provider => provider.DisplayOrder)
            .ThenBy(provider => provider.DisplayName ?? provider.Name)
            .Include(provider => provider.AvailabilitySlots.Where(slot => slot.Status == "Available" && slot.StartsAtUtc >= DateTimeOffset.UtcNow))
            .Take(limit)
            .ToListAsync(cancellationToken);

        var response = providers.Select(provider => new ProviderDirectoryItemDto(
            provider.Id,
            provider.DisplayName ?? provider.Name,
            provider.Summary,
            provider.Bio ?? provider.LongDescription,
            ReadSpecializations(provider.SpecializationsJson),
            provider.AvatarColor,
            provider.Sessions,
            provider.RatingAverage > 0 ? provider.RatingAverage : provider.Rating,
            provider.AvailabilitySlots
                .OrderBy(slot => slot.StartsAtUtc)
                .Take(10)
                .Select(slot => new ProviderDateDto(
                    slot.StartsAtUtc.ToString("MMM d"),
                    slot.StartsAtUtc.ToString("yyyy-MM-dd")))
                .ToList())).ToList();

        return Ok(response);
    }

    private static IReadOnlyList<string> ReadSpecializations(string value)
    {
        try
        {
            return JsonSerializer.Deserialize<IReadOnlyList<string>>(value) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

public sealed record LandingContentResponse(IReadOnlyList<FeaturedExpertDto> FeaturedExperts);

public sealed record FeaturedExpertDto(Guid Id, string Name, string Role, string Availability);

public sealed record VisitorFlowResponse(string FlowKey, IReadOnlyList<VisitorFlowQuestionDto> Questions);

public sealed record VisitorFlowQuestionDto(Guid Id, int StepOrder, string Text);

public sealed record ProviderDirectoryItemDto(
    Guid Id,
    string Name,
    string Summary,
    string LongDescription,
    IReadOnlyList<string> Specializations,
    string AvatarColor,
    int Sessions,
    decimal Rating,
    IReadOnlyList<ProviderDateDto> NextDates);

public sealed record ProviderDateDto(string Display, string Iso);
