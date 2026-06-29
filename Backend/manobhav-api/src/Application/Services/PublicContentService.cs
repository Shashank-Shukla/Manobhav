using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;

namespace Application.Services;

public sealed class PublicContentService : IPublicContentService
{
    private const int FeaturedExpertLimit = 4;
    private const int VisitorFlowQuestionLimit = 50;
    private static readonly JsonSerializerOptions WeeklyAvailabilityJsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IPublicContentRepository _repository;

    public PublicContentService(IPublicContentRepository repository)
    {
        _repository = repository;
    }

    public async Task<LandingContentResponse> GetLandingAsync(CancellationToken cancellationToken)
    {
        var experts = await _repository.GetFeaturedExpertsAsync(FeaturedExpertLimit, cancellationToken);
        var response = experts
            .Select(provider => new FeaturedExpertDto(
                provider.Id,
                provider.DisplayName ?? provider.Name,
                provider.ProfessionalTitle ?? provider.Role,
                "Availability managed by API"))
            .ToList();
        return new LandingContentResponse(response);
    }

    public async Task<IReadOnlyList<ProviderDirectoryItemDto>> GetProvidersAsync(bool featured, int limit, CancellationToken cancellationToken)
    {
        var clampedLimit = Math.Clamp(limit, 1, 100);
        var providers = await _repository.GetProvidersAsync(featured, clampedLimit, cancellationToken);
        return providers
            .Select(provider => new ProviderDirectoryItemDto(
                provider.Id,
                provider.DisplayName ?? provider.Name,
                provider.Summary,
                provider.Bio ?? provider.LongDescription,
                ReadStringList(provider.SpecializationsJson),
                provider.AvatarColor,
                provider.Sessions,
                provider.RatingAverage > 0 ? provider.RatingAverage : provider.Rating,
                ReadWeeklyAvailability(provider.WeeklyAvailabilityJson)))
            .ToList();
    }

    public async Task<VisitorFlowResponse> GetVisitorFlowAsync(string flowKey, CancellationToken cancellationToken)
    {
        var questions = await _repository.GetVisitorFlowQuestionsAsync(flowKey, VisitorFlowQuestionLimit, cancellationToken);
        var response = questions
            .Select(question => new VisitorFlowQuestionDto(question.Id, question.StepOrder, question.Text))
            .ToList();
        return new VisitorFlowResponse(flowKey, response);
    }

    private static IReadOnlyList<string> ReadStringList(string value)
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

    /// <summary>
    /// Reads the provider's recurring weekly availability. The directory UI derives the next
    /// available dates (in the visitor's local time) and the booking calendar's enabled weekdays
    /// from this, rather than from pre-generated dated slots.
    /// </summary>
    private static IReadOnlyList<ProviderWeeklySlotDto> ReadWeeklyAvailability(string value)
    {
        try
        {
            return JsonSerializer.Deserialize<IReadOnlyList<ProviderWeeklySlotDto>>(value, WeeklyAvailabilityJsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
