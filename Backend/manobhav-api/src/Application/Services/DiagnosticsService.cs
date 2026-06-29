using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;

namespace Application.Services;

public sealed class DiagnosticsService : IDiagnosticsService
{
    private const int MaxLimit = 200;

    private static readonly string[] ExposedTables =
    [
        "users",
        "provider-profiles",
        "provider-applications",
        "availability-slots",
        "appointments",
        "booking-holds",
        "user-roles",
    ];

    private readonly IDiagnosticsRepository _repository;

    public DiagnosticsService(IDiagnosticsRepository repository)
    {
        _repository = repository;
    }

    public IReadOnlyList<string> Tables => ExposedTables;

    public async Task<IReadOnlyList<DiagnosticsTableSummaryDto>> GetSummaryAsync(CancellationToken cancellationToken)
    {
        var counts = await _repository.GetTableCountsAsync(ExposedTables, cancellationToken);
        return ExposedTables
            .Select(table => new DiagnosticsTableSummaryDto(table, counts.TryGetValue(table, out var count) ? count : 0))
            .ToList();
    }

    public async Task<object?> GetTableAsync(string table, int limit, int offset, CancellationToken cancellationToken)
    {
        var safeLimit = Math.Clamp(limit, 1, MaxLimit);
        var safeOffset = Math.Max(0, offset);

        return table switch
        {
            "users" => (await _repository.GetUsersAsync(safeLimit, safeOffset, cancellationToken))
                .Select(item => new DiagnosticsUserDto(
                    item.Id,
                    MaskEmail(item.Email),
                    MaskPhone(item.Phone),
                    item.Name,
                    item.DisplayName,
                    item.AccountStatus,
                    item.CreatedAtUtc,
                    item.LastLoginAtUtc))
                .ToList(),

            "provider-profiles" => (await _repository.GetProviderProfilesAsync(safeLimit, safeOffset, cancellationToken))
                .Select(item => new DiagnosticsProviderProfileDto(
                    item.Id,
                    item.ProviderApplicationId,
                    item.UserId,
                    item.Name,
                    item.DisplayName,
                    item.Role,
                    item.Summary,
                    item.LongDescription,
                    item.SpecializationsJson,
                    item.WeeklyAvailabilityJson,
                    item.VisibilityStatus,
                    item.IsActive,
                    item.IsFeatured,
                    item.Sessions,
                    item.RatingAverage > 0 ? item.RatingAverage : item.Rating,
                    item.CreatedAtUtc,
                    item.PublishedAtUtc))
                .ToList(),

            "provider-applications" => (await _repository.GetProviderApplicationsAsync(safeLimit, safeOffset, cancellationToken))
                .Select(item => new DiagnosticsProviderApplicationDto(
                    item.Id,
                    item.UserId,
                    item.Status,
                    item.CurrentStep,
                    item.CreatedAtUtc,
                    item.UpdatedAtUtc,
                    item.SubmittedAtUtc,
                    item.BioJson,
                    ExtractAvailabilitySlots(item.SessionDetailsJson)))
                .ToList(),

            "availability-slots" => (await _repository.GetAvailabilitySlotsAsync(safeLimit, safeOffset, cancellationToken))
                .Select(item => new DiagnosticsAvailabilitySlotDto(
                    item.Id, item.ProviderProfileId, item.StartsAtUtc, item.EndsAtUtc, item.Status))
                .ToList(),

            "appointments" => (await _repository.GetAppointmentsAsync(safeLimit, safeOffset, cancellationToken))
                .Select(item => new DiagnosticsAppointmentDto(
                    item.Id, item.ProviderProfileId, item.PatientUserId, item.SlotId,
                    item.StartsAtUtc, item.EndsAtUtc, item.Status, item.PaymentStatus))
                .ToList(),

            "booking-holds" => (await _repository.GetBookingHoldsAsync(safeLimit, safeOffset, cancellationToken))
                .Select(item => new DiagnosticsBookingHoldDto(
                    item.Id, item.ProviderProfileId, item.SlotId, item.UserId, item.VisitorSessionId,
                    item.Status, item.ExpiresAtUtc))
                .ToList(),

            "user-roles" => (await _repository.GetUserRolesAsync(safeLimit, safeOffset, cancellationToken))
                .Select(item => new DiagnosticsUserRoleDto(item.Id, item.UserId, item.Role, item.IsActive))
                .ToList(),

            _ => (object?)null,
        };
    }

    private static string? MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return email;
        }

        var at = email.IndexOf('@');
        return at <= 0 ? "***" : $"{email[0]}***{email[at..]}";
    }

    private static string? MaskPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return phone;
        }

        return phone.Length <= 3 ? "***" : new string('*', phone.Length - 3) + phone[^3..];
    }

    private static string ExtractAvailabilitySlots(string sessionDetailsJson)
    {
        if (string.IsNullOrWhiteSpace(sessionDetailsJson))
        {
            return "[]";
        }

        try
        {
            using var document = JsonDocument.Parse(sessionDetailsJson);
            if (document.RootElement.ValueKind == JsonValueKind.Object &&
                document.RootElement.TryGetProperty("sessionDetails", out var sessionDetails) &&
                sessionDetails.ValueKind == JsonValueKind.Object &&
                sessionDetails.TryGetProperty("availabilitySlots", out var slots))
            {
                return slots.GetRawText();
            }
        }
        catch (JsonException)
        {
            // fall through to default
        }

        return "[]";
    }
}
