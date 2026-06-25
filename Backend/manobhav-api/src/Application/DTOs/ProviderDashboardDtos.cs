namespace Application.DTOs;

public sealed record ProviderDashboardDto(
    ProviderDashboardProfileDto Provider,
    ProviderDashboardMetricsDto Metrics,
    IReadOnlyList<ProviderDashboardTodayAppointmentDto> TodayAppointments,
    IReadOnlyList<ProviderDashboardUpcomingAppointmentDto> UpcomingAppointments,
    IReadOnlyList<ProviderDashboardCalendarDayDto> WeekCalendar,
    ProviderDashboardNotificationsDto Notifications);

public sealed record ProviderDashboardProfileDto(
    string Name,
    string ShortName,
    string? Title,
    string AvatarInitials,
    string AvatarColor,
    string Status,
    bool ProfilePublished);

public sealed record ProviderDashboardMetricsDto(
    int SessionsTotal,
    int SessionsThisWeek,
    int UpcomingCount);

public sealed record ProviderDashboardTodayAppointmentDto(
    string Id,
    string PatientName,
    string StartsAtUtc,
    string EndsAtUtc);

public sealed record ProviderDashboardUpcomingAppointmentDto(
    string Id,
    string PatientName,
    string StartsAtUtc);

public sealed record ProviderDashboardCalendarDayDto(
    string DateUtc,
    int AppointmentCount,
    bool IsToday);

public sealed record ProviderDashboardNotificationsDto(int UnreadCount);
