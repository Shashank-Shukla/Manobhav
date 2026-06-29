namespace Application.DTOs;

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
    IReadOnlyList<ProviderWeeklySlotDto> WeeklyAvailability);

/// <summary>A recurring weekly availability window. DayOfWeek is 0=Sunday..6=Saturday; times are 24-hour "HH:mm".</summary>
public sealed record ProviderWeeklySlotDto(int DayOfWeek, string StartTime, string EndTime);
