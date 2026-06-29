using System.Globalization;
using System.Text.Json;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/provider")]
public sealed class ProviderController : ControllerBase
{
    private const int UpcomingTake = 10;
    private const int TodayTake = 50;
    private const int CalendarTake = 200;
    private const int CalendarDays = 7;

    private readonly ApplicationDbContext _db;

    public ProviderController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(ProviderDashboardDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProviderDashboardDto>> GetDashboard(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var user = await ResolveCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Ok(BuildEmptyDashboard(profileStatus: "PendingProfile", name: "Provider", profilePublished: false, now));
        }

        var context = await ResolveProfileContextAsync(user, cancellationToken);
        if (context.Profile is null)
        {
            return Ok(BuildEmptyDashboard(context.Status, context.Name, profilePublished: false, now));
        }

        return Ok(await BuildProviderDashboardAsync(context, now, cancellationToken));
    }

    private async Task<ProviderDashboardDto> BuildProviderDashboardAsync(
        ProfileContext context,
        DateTimeOffset now,
        CancellationToken cancellationToken = default)
    {
        var profile = context.Profile!;
        var metrics = await ReadMetricsAsync(profile.Id, now, cancellationToken);
        var today = await ReadTodayAppointmentsAsync(profile.Id, now, cancellationToken);
        var upcoming = await ReadUpcomingAppointmentsAsync(profile.Id, now, cancellationToken);
        var calendar = await ReadWeekCalendarAsync(profile.Id, now, cancellationToken);

        return new ProviderDashboardDto(
            BuildProfileDto(context, profilePublished: profile.VisibilityStatus == "Published"),
            metrics,
            today,
            upcoming,
            calendar,
            new ProviderDashboardNotificationsDto(0));
    }

    private async Task<User?> ResolveCurrentUserAsync(CancellationToken cancellationToken = default)
    {
        var subject = User.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(subject))
        {
            return null;
        }

        return await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.CognitoSubject == subject, cancellationToken);
    }

    private async Task<ProfileContext> ResolveProfileContextAsync(User user, CancellationToken cancellationToken = default)
    {
        var profile = await _db.ProviderProfiles
            .AsNoTracking()
            .Where(item => item.UserId == user.Id)
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (profile is not null)
        {
            var name = FirstNonEmpty(profile.DisplayName, profile.Name) ?? "Provider";
            return new ProfileContext(profile, "Provider", name, profile.ProfessionalTitle, profile.AvatarColor);
        }

        return await ResolveApplicantContextAsync(user, cancellationToken);
    }

    private async Task<ProfileContext> ResolveApplicantContextAsync(User user, CancellationToken cancellationToken = default)
    {
        var application = await _db.ProviderOnboardingApplications
            .AsNoTracking()
            .Where(item => item.UserId == user.Id)
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        var isApplicant = await _db.UserRoles
            .AsNoTracking()
            .AnyAsync(item => item.UserId == user.Id && item.Role == "ProviderApplicant" && item.IsActive, cancellationToken);

        if (application is null && !isApplicant)
        {
            return new ProfileContext(null, "PendingProfile", NameFromUser(user), null, null);
        }

        var applicationName = ReadApplicationDisplayName(application);
        var name = FirstNonEmpty(applicationName, user.DisplayName, user.Name) ?? "Provider";
        return new ProfileContext(null, "ProviderApplicant", name, null, null);
    }

    private async Task<ProviderDashboardMetricsDto> ReadMetricsAsync(
        Guid profileId,
        DateTimeOffset now,
        CancellationToken cancellationToken = default)
    {
        var (weekStart, weekEnd) = GetIsoWeekRange(now);
        var sessionsTotal = await _db.Appointments
            .AsNoTracking()
            .CountAsync(item => item.ProviderProfileId == profileId && item.Status == "Completed", cancellationToken);
        var upcomingCount = await _db.Appointments
            .AsNoTracking()
            .CountAsync(item => item.ProviderProfileId == profileId && item.Status == "Scheduled" && item.StartsAtUtc >= now, cancellationToken);
        var sessionsThisWeek = await _db.Appointments
            .AsNoTracking()
            .CountAsync(item => item.ProviderProfileId == profileId && item.StartsAtUtc >= weekStart && item.StartsAtUtc < weekEnd, cancellationToken);

        return new ProviderDashboardMetricsDto(sessionsTotal, sessionsThisWeek, upcomingCount);
    }

    private async Task<IReadOnlyList<ProviderDashboardTodayAppointmentDto>> ReadTodayAppointmentsAsync(
        Guid profileId,
        DateTimeOffset now,
        CancellationToken cancellationToken = default)
    {
        var todayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var tomorrowStart = todayStart.AddDays(1);
        var appointments = await _db.Appointments
            .AsNoTracking()
            .Where(item => item.ProviderProfileId == profileId
                && item.Status == "Scheduled"
                && item.StartsAtUtc >= todayStart
                && item.StartsAtUtc < tomorrowStart)
            .OrderBy(item => item.StartsAtUtc)
            .Take(TodayTake)
            .Select(item => new { item.Id, item.PatientUserId, item.StartsAtUtc, item.EndsAtUtc })
            .ToListAsync(cancellationToken);

        var patientNames = await ReadPatientNamesAsync(appointments.Select(item => item.PatientUserId), cancellationToken);
        return appointments
            .Select(item => new ProviderDashboardTodayAppointmentDto(
                item.Id.ToString(),
                ResolvePatientName(patientNames, item.PatientUserId),
                ToIso(item.StartsAtUtc),
                ToIso(item.EndsAtUtc)))
            .ToList();
    }

    private async Task<IReadOnlyList<ProviderDashboardUpcomingAppointmentDto>> ReadUpcomingAppointmentsAsync(
        Guid profileId,
        DateTimeOffset now,
        CancellationToken cancellationToken = default)
    {
        var appointments = await _db.Appointments
            .AsNoTracking()
            .Where(item => item.ProviderProfileId == profileId && item.Status == "Scheduled" && item.StartsAtUtc >= now)
            .OrderBy(item => item.StartsAtUtc)
            .Take(UpcomingTake)
            .Select(item => new { item.Id, item.PatientUserId, item.StartsAtUtc })
            .ToListAsync(cancellationToken);

        var patientNames = await ReadPatientNamesAsync(appointments.Select(item => item.PatientUserId), cancellationToken);
        return appointments
            .Select(item => new ProviderDashboardUpcomingAppointmentDto(
                item.Id.ToString(),
                ResolvePatientName(patientNames, item.PatientUserId),
                ToIso(item.StartsAtUtc)))
            .ToList();
    }

    private async Task<IReadOnlyList<ProviderDashboardCalendarDayDto>> ReadWeekCalendarAsync(
        Guid profileId,
        DateTimeOffset now,
        CancellationToken cancellationToken = default)
    {
        var todayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var windowEnd = todayStart.AddDays(CalendarDays);
        var appointments = await _db.Appointments
            .AsNoTracking()
            .Where(item => item.ProviderProfileId == profileId
                && item.Status == "Scheduled"
                && item.StartsAtUtc >= todayStart
                && item.StartsAtUtc < windowEnd)
            .Select(item => item.StartsAtUtc)
            .Take(CalendarTake)
            .ToListAsync(cancellationToken);

        var countsByDay = appointments
            .GroupBy(startsAt => startsAt.UtcDateTime.Date)
            .ToDictionary(group => group.Key, group => group.Count());

        return Enumerable.Range(0, CalendarDays)
            .Select(offset => BuildCalendarDay(todayStart, offset, countsByDay))
            .ToList();
    }

    private async Task<Dictionary<Guid, string>> ReadPatientNamesAsync(
        IEnumerable<Guid> patientUserIds,
        CancellationToken cancellationToken = default)
    {
        var ids = patientUserIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        return await _db.Users
            .AsNoTracking()
            .Where(item => ids.Contains(item.Id) && item.Name != null)
            .ToDictionaryAsync(item => item.Id, item => item.Name!, cancellationToken);
    }

    private static ProviderDashboardCalendarDayDto BuildCalendarDay(
        DateTimeOffset todayStart,
        int offset,
        IReadOnlyDictionary<DateTime, int> countsByDay)
    {
        var day = todayStart.AddDays(offset);
        var count = countsByDay.GetValueOrDefault(day.UtcDateTime.Date);
        return new ProviderDashboardCalendarDayDto(ToIso(day), count, offset == 0);
    }

    private static ProviderDashboardProfileDto BuildProfileDto(ProfileContext context, bool profilePublished)
    {
        return new ProviderDashboardProfileDto(
            context.Name,
            BuildShortName(context.Name),
            context.Title,
            BuildInitials(context.Name),
            context.AvatarColor ?? "#9CAF88",
            context.Status,
            profilePublished);
    }

    private static ProviderDashboardDto BuildEmptyDashboard(
        string profileStatus,
        string name,
        bool profilePublished,
        DateTimeOffset now)
    {
        return new ProviderDashboardDto(
            new ProviderDashboardProfileDto(
                name,
                BuildShortName(name),
                null,
                BuildInitials(name),
                "#9CAF88",
                profileStatus,
                profilePublished),
            new ProviderDashboardMetricsDto(0, 0, 0),
            [],
            [],
            BuildEmptyWeekCalendar(now),
            new ProviderDashboardNotificationsDto(0));
    }

    private static IReadOnlyList<ProviderDashboardCalendarDayDto> BuildEmptyWeekCalendar(DateTimeOffset now)
    {
        var todayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var empty = new Dictionary<DateTime, int>();
        return Enumerable.Range(0, CalendarDays)
            .Select(offset => BuildCalendarDay(todayStart, offset, empty))
            .ToList();
    }

    private static string ResolvePatientName(IReadOnlyDictionary<Guid, string> patientNames, Guid patientUserId)
    {
        return patientNames.TryGetValue(patientUserId, out var name) && !string.IsNullOrWhiteSpace(name)
            ? name
            : "Patient";
    }

    private static string NameFromUser(User user)
    {
        return FirstNonEmpty(user.DisplayName, user.Name) ?? "Provider";
    }

    private static string? ReadApplicationDisplayName(ProviderOnboardingApplication? application)
    {
        if (application is null)
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(application.BasicProfileJson);
            if (document.RootElement.ValueKind == JsonValueKind.Object &&
                document.RootElement.TryGetProperty("displayName", out var displayName) &&
                displayName.ValueKind == JsonValueKind.String)
            {
                return displayName.GetString();
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static string? FirstNonEmpty(params string?[] candidates)
    {
        return candidates.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    private static string BuildShortName(string name)
    {
        var firstWord = name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return string.IsNullOrWhiteSpace(firstWord) ? name : firstWord;
    }

    private static string BuildInitials(string name)
    {
        var words = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length == 0)
        {
            return "P";
        }

        var first = char.ToUpperInvariant(words[0][0]);
        if (words.Length == 1)
        {
            return first.ToString();
        }

        var last = char.ToUpperInvariant(words[^1][0]);
        return $"{first}{last}";
    }

    private static (DateTimeOffset Start, DateTimeOffset End) GetIsoWeekRange(DateTimeOffset now)
    {
        var date = now.UtcDateTime.Date;
        var diff = ((int)date.DayOfWeek + 6) % 7; // Monday = 0
        var weekStart = new DateTimeOffset(date.AddDays(-diff), TimeSpan.Zero);
        return (weekStart, weekStart.AddDays(7));
    }

    private static string ToIso(DateTimeOffset value)
    {
        return value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
    }

    private sealed record ProfileContext(
        ProviderProfile? Profile,
        string Status,
        string Name,
        string? Title,
        string? AvatarColor);
}
