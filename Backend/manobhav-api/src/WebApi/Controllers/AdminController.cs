using System.Text.Json;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin")]
public sealed class AdminController : ControllerBase
{
    private const int RosterPageSize = 25;

    private readonly ApplicationDbContext _db;

    public AdminController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("session")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult GetSession()
    {
        return Ok(new { status = "authorized" });
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AdminDashboardDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminDashboardDto>> GetDashboard(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var todayStart = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var tomorrowStart = todayStart.AddDays(1);

        var providers = await ReadProvidersAsync(cancellationToken);
        var bookings = await ReadBookingsAsync(now, cancellationToken);
        var slots = await ReadSlotsAsync(now, cancellationToken);
        var metrics = await ReadMetricsAsync(todayStart, tomorrowStart, cancellationToken);
        var queues = await ReadQueuesAsync(cancellationToken);

        return Ok(new AdminDashboardDto(
            metrics,
            queues,
            ReadQuickActions(),
            providers,
            bookings,
            slots));
    }

    [HttpGet("providers")]
    [ProducesResponseType(typeof(AdminPagedResult<AdminProviderRosterDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminPagedResult<AdminProviderRosterDto>>> GetProviders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = RosterPageSize,
        [FromQuery] int? offset = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var (normalizedPage, normalizedPageSize, skip) = NormalizePaging(page, pageSize, offset);
        var term = NormalizeSearch(search);

        var query = _db.ProviderProfiles.AsNoTracking();
        if (term is not null)
        {
            query = query.Where(provider =>
                (provider.DisplayName != null && provider.DisplayName.ToLower().Contains(term)) ||
                provider.Name.ToLower().Contains(term) ||
                (provider.ProfessionalTitle != null && provider.ProfessionalTitle.ToLower().Contains(term)) ||
                provider.Role.ToLower().Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(provider => provider.DisplayOrder)
            .ThenBy(provider => provider.DisplayName ?? provider.Name)
            .Skip(skip)
            .Take(normalizedPageSize)
            .Select(provider => new
            {
                provider.Id,
                Name = provider.DisplayName ?? provider.Name,
                Title = provider.ProfessionalTitle ?? provider.Role,
                provider.VisibilityStatus,
                provider.IsActive,
                provider.SpecializationsJson,
                provider.Sessions,
                provider.Rating,
                provider.RatingAverage
            })
            .ToListAsync(cancellationToken);

        var items = rows.Select(provider =>
        {
            var visibility = provider.IsActive ? provider.VisibilityStatus : "Inactive";
            return new AdminProviderRosterDto(
                provider.Id.ToString(),
                provider.Name,
                provider.Title,
                visibility,
                ToneFromStatus(visibility),
                ReadSpecializations(provider.SpecializationsJson),
                provider.Sessions,
                provider.RatingAverage > 0 ? provider.RatingAverage : provider.Rating);
        }).ToList();

        return Ok(new AdminPagedResult<AdminProviderRosterDto>(items, normalizedPage, normalizedPageSize, total));
    }

    [HttpGet("patients")]
    [ProducesResponseType(typeof(AdminPagedResult<AdminPatientRosterDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminPagedResult<AdminPatientRosterDto>>> GetPatients(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = RosterPageSize,
        [FromQuery] int? offset = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var (normalizedPage, normalizedPageSize, skip) = NormalizePaging(page, pageSize, offset);
        var term = NormalizeSearch(search);

        // Patients are care-seeking account holders: every user that is not an active provider or
        // provider applicant. (Admins are a Cognito-group concept, not a database role.)
        var providerUserIds = _db.UserRoles
            .Where(role => role.IsActive && (role.Role == "Provider" || role.Role == "ProviderApplicant"))
            .Select(role => role.UserId);

        var query = _db.Users
            .AsNoTracking()
            .Where(user => !providerUserIds.Contains(user.Id));
        if (term is not null)
        {
            query = query.Where(user =>
                (user.Name != null && user.Name.ToLower().Contains(term)) ||
                (user.DisplayName != null && user.DisplayName.ToLower().Contains(term)) ||
                (user.Email != null && user.Email.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(user => user.CreatedAtUtc)
            .Skip(skip)
            .Take(normalizedPageSize)
            .Select(user => new
            {
                user.Id,
                user.Name,
                user.DisplayName,
                user.Email,
                user.AccountStatus,
                user.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var userIds = rows.Select(row => row.Id).ToList();
        var sessionsByPatient = await _db.Appointments
            .AsNoTracking()
            .Where(appointment => userIds.Contains(appointment.PatientUserId) && appointment.Status == "Completed")
            .GroupBy(appointment => appointment.PatientUserId)
            .Select(group => new { PatientUserId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.PatientUserId, item => item.Count, cancellationToken);

        var items = rows.Select(row => new AdminPatientRosterDto(
            row.Id.ToString(),
            ResolvePatientDisplayName(row.DisplayName, row.Name, row.Email),
            string.IsNullOrWhiteSpace(row.Email) ? "Not provided" : row.Email!,
            string.IsNullOrWhiteSpace(row.AccountStatus) ? "Active" : row.AccountStatus,
            row.CreatedAtUtc.ToString("MMM d, yyyy"),
            sessionsByPatient.GetValueOrDefault(row.Id))).ToList();

        return Ok(new AdminPagedResult<AdminPatientRosterDto>(items, normalizedPage, normalizedPageSize, total));
    }

    private static (int Page, int PageSize, int Skip) NormalizePaging(int page, int pageSize, int? offset)
    {
        var normalizedPageSize = pageSize <= 0 ? RosterPageSize : Math.Min(pageSize, RosterPageSize);

        // An explicit, non-negative offset wins over page when both are supplied — it lets callers
        // page by absolute row position. Otherwise the offset is derived from the 1-based page.
        if (offset is int requestedOffset && requestedOffset >= 0)
        {
            return ((requestedOffset / normalizedPageSize) + 1, normalizedPageSize, requestedOffset);
        }

        var normalizedPage = page < 1 ? 1 : page;
        return (normalizedPage, normalizedPageSize, (normalizedPage - 1) * normalizedPageSize);
    }

    private static string? NormalizeSearch(string? search)
    {
        var trimmed = search?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed.ToLowerInvariant();
    }

    private static string ResolvePatientDisplayName(string? displayName, string? name, string? email)
    {
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            return displayName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            return name.Trim();
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var local = email.Split('@', 2)[0];
            return string.IsNullOrWhiteSpace(local) ? "Patient" : local;
        }

        return "Patient";
    }

    private async Task<IReadOnlyList<AdminProviderRecordDto>> ReadProvidersAsync(CancellationToken cancellationToken)
    {
        var providers = await _db.ProviderProfiles
            .AsNoTracking()
            .OrderBy(provider => provider.DisplayOrder)
            .ThenBy(provider => provider.DisplayName ?? provider.Name)
            .Take(100)
            .Select(provider => new
            {
                provider.Id,
                Name = provider.DisplayName ?? provider.Name,
                Role = provider.ProfessionalTitle ?? provider.Role,
                provider.VisibilityStatus,
                provider.SpecializationsJson,
                provider.Sessions,
                provider.Rating,
                provider.RatingAverage,
                provider.ReviewCount,
                provider.IsActive
            })
            .ToListAsync(cancellationToken);

        var providerIds = providers.Select(provider => provider.Id).ToList();
        var bookedSlotCounts = await _db.ProviderAvailabilitySlots
            .AsNoTracking()
            .Where(slot => providerIds.Contains(slot.ProviderProfileId) && slot.Status == "Booked")
            .GroupBy(slot => slot.ProviderProfileId)
            .Select(group => new { ProviderId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ProviderId, item => item.Count, cancellationToken);

        var nextOpenSlots = await _db.ProviderAvailabilitySlots
            .AsNoTracking()
            .Where(slot => providerIds.Contains(slot.ProviderProfileId) && slot.Status == "Available" && slot.StartsAtUtc >= DateTimeOffset.UtcNow)
            .OrderBy(slot => slot.StartsAtUtc)
            .GroupBy(slot => slot.ProviderProfileId)
            .Select(group => new { ProviderId = group.Key, StartsAtUtc = group.Min(slot => slot.StartsAtUtc) })
            .ToDictionaryAsync(item => item.ProviderId, item => item.StartsAtUtc, cancellationToken);

        return providers.Select(provider =>
        {
            var bookedSlots = bookedSlotCounts.GetValueOrDefault(provider.Id);
            var load = Math.Clamp(bookedSlots * 10, 0, 100);
            var visibility = provider.IsActive ? provider.VisibilityStatus : "Inactive";
            return new AdminProviderRecordDto(
                provider.Id.ToString(),
                provider.Name,
                provider.Role,
                visibility,
                ToneFromStatus(visibility),
                ReadSpecializations(provider.SpecializationsJson),
                load,
                nextOpenSlots.TryGetValue(provider.Id, out var nextOpenSlot) ? nextOpenSlot.ToString("MMM d, h:mm tt") : "No open slot",
                provider.Sessions,
                provider.RatingAverage > 0 ? provider.RatingAverage : provider.Rating,
                "MVP",
                load);
        }).ToList();
    }

    private async Task<IReadOnlyList<AdminBookingRecordDto>> ReadBookingsAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var appointments = await _db.Appointments
            .AsNoTracking()
            .Where(appointment => appointment.StartsAtUtc >= now.AddDays(-7))
            .OrderBy(appointment => appointment.StartsAtUtc)
            .Take(100)
            .ToListAsync(cancellationToken);

        var providerIds = appointments.Select(appointment => appointment.ProviderProfileId).Distinct().ToList();
        var providerNames = await _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => providerIds.Contains(provider.Id))
            .ToDictionaryAsync(provider => provider.Id, provider => provider.DisplayName ?? provider.Name, cancellationToken);

        return appointments.Select(appointment => new AdminBookingRecordDto(
            appointment.Id.ToString(),
            $"Patient {ShortId(appointment.PatientUserId)}",
            providerNames.GetValueOrDefault(appointment.ProviderProfileId, "Provider unavailable"),
            appointment.StartsAtUtc.ToString("MMM d"),
            appointment.StartsAtUtc.ToString("h:mm tt"),
            appointment.Status,
            ToneFromStatus(appointment.Status),
            "Therapy",
            appointment.PaymentStatus,
            0)).ToList();
    }

    private async Task<IReadOnlyList<AdminSlotRecordDto>> ReadSlotsAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var slots = await _db.ProviderAvailabilitySlots
            .AsNoTracking()
            .Where(slot => slot.StartsAtUtc >= now && slot.StartsAtUtc <= now.AddDays(14))
            .OrderBy(slot => slot.StartsAtUtc)
            .Take(300)
            .Select(slot => new { slot.ProviderProfileId, slot.StartsAtUtc, slot.Status })
            .ToListAsync(cancellationToken);

        var providerIds = slots.Select(slot => slot.ProviderProfileId).Distinct().ToList();
        var providerNames = await _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => providerIds.Contains(provider.Id))
            .ToDictionaryAsync(provider => provider.Id, provider => provider.DisplayName ?? provider.Name, cancellationToken);

        return slots
            .GroupBy(slot => new { slot.ProviderProfileId, Day = slot.StartsAtUtc.ToString("MMM d") })
            .Select(group => new AdminSlotRecordDto(
                $"{group.Key.ProviderProfileId:N}-{group.Key.Day}",
                providerNames.GetValueOrDefault(group.Key.ProviderProfileId, "Provider unavailable"),
                group.Key.Day,
                group.Count(slot => slot.Status == "Available"),
                group.Count(slot => slot.Status == "Booked"),
                group.Count(slot => slot.Status != "Available" && slot.Status != "Booked")))
            .ToList();
    }

    private async Task<IReadOnlyList<AdminInsightMetricDto>> ReadMetricsAsync(
        DateTimeOffset todayStart,
        DateTimeOffset tomorrowStart,
        CancellationToken cancellationToken)
    {
        var sessionsToday = await _db.Appointments.CountAsync(
            appointment => appointment.StartsAtUtc >= todayStart && appointment.StartsAtUtc < tomorrowStart,
            cancellationToken);
        var activeProviders = await _db.ProviderProfiles.CountAsync(provider => provider.IsActive, cancellationToken);
        var pendingApplications = await _db.ProviderOnboardingApplications.CountAsync(item => item.Status == "Submitted", cancellationToken);
        var activeHolds = await _db.BookingHolds.CountAsync(item => item.Status == "Active" && item.ExpiresAtUtc > DateTimeOffset.UtcNow, cancellationToken);

        return
        [
            new("sessions-today", "Sessions today", sessionsToday.ToString(), "API", "Scheduled appointments", "sage"),
            new("provider-utilization", "Active providers", activeProviders.ToString(), "API", "Published and private providers", "blue"),
            new("care-followups", "Pending applications", pendingApplications.ToString(), "Review", "Provider onboarding queue", "rose"),
            new("pending-payouts", "Active holds", activeHolds.ToString(), "15 min", "Booking holds awaiting finalization", "amber")
        ];
    }

    private async Task<IReadOnlyList<AdminQueueItemDto>> ReadQueuesAsync(CancellationToken cancellationToken)
    {
        var submittedApplications = await _db.ProviderOnboardingApplications.CountAsync(item => item.Status == "Submitted", cancellationToken);
        var activeHolds = await _db.BookingHolds.CountAsync(item => item.Status == "Active" && item.ExpiresAtUtc > DateTimeOffset.UtcNow, cancellationToken);

        var queues = new List<AdminQueueItemDto>();
        if (submittedApplications > 0)
        {
            queues.Add(new("provider-review", "Provider applications pending", $"{submittedApplications} submitted applications", "Review", "blue"));
        }

        if (activeHolds > 0)
        {
            queues.Add(new("booking-holds", "Booking holds active", $"{activeHolds} holds inside 15-minute window", "Booking", "amber"));
        }

        return queues;
    }

    private static IReadOnlyList<AdminQueueItemDto> ReadQuickActions()
    {
        return
        [
            new("review-providers", "Review providers", "Open submitted onboarding applications", "Providers", "blue"),
            new("inspect-bookings", "Inspect bookings", "Check holds, appointments, and slot pressure", "Bookings", "sage")
        ];
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

    private static string ToneFromStatus(string status)
    {
        return status.ToLowerInvariant() switch
        {
            "published" or "scheduled" or "active" => "sage",
            "submitted" or "held" => "blue",
            "needschanges" or "pending" => "amber",
            "rejected" or "cancelled" or "inactive" => "red",
            _ => "grey"
        };
    }

    private static string ShortId(Guid value)
    {
        return value.ToString("N")[..8];
    }
}

public sealed record AdminDashboardDto(
    IReadOnlyList<AdminInsightMetricDto> InsightMetrics,
    IReadOnlyList<AdminQueueItemDto> OpsQueues,
    IReadOnlyList<AdminQueueItemDto> QuickActions,
    IReadOnlyList<AdminProviderRecordDto> Providers,
    IReadOnlyList<AdminBookingRecordDto> Bookings,
    IReadOnlyList<AdminSlotRecordDto> Slots);

public sealed record AdminInsightMetricDto(string Id, string Label, string Value, string Delta, string Helper, string Tone);

public sealed record AdminQueueItemDto(string Id, string Title, string Meta, string Status, string Tone);

public sealed record AdminProviderRecordDto(
    string Id,
    string Name,
    string Role,
    string Status,
    string Tone,
    IReadOnlyList<string> Specialities,
    int Load,
    string NextOpenSlot,
    int SessionsThisMonth,
    decimal Rating,
    string SalaryBand,
    int Utilization);

public sealed record AdminBookingRecordDto(
    string Id,
    string PatientName,
    string ProviderName,
    string Date,
    string Time,
    string Status,
    string Tone,
    string Type,
    string Payment,
    int Reschedules);

public sealed record AdminSlotRecordDto(string Id, string ProviderName, string Day, int Open, int Booked, int Blocked);

public sealed record AdminPagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public sealed record AdminProviderRosterDto(
    string Id,
    string Name,
    string Title,
    string Status,
    string Tone,
    IReadOnlyList<string> Specialities,
    int Sessions,
    decimal Rating);

public sealed record AdminPatientRosterDto(
    string Id,
    string Name,
    string Email,
    string Status,
    string JoinedAt,
    int SessionsCompleted);
