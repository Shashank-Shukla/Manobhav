using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;

namespace Application.Services;

public sealed class ProviderAvailabilityService : IProviderAvailabilityService
{
    // Sessions are a fixed one hour, and provider availability is captured in India local civil time
    // (this is an India-only platform — RCI licences, IFSC payouts, DPDP). Bookable slots are
    // materialized from the recurring weekly schedule on demand using this fixed offset (no DST).
    private const int SessionMinutes = 60;
    private const int MaxSlots = 100;
    private static readonly TimeSpan IndiaOffset = TimeSpan.FromHours(5.5);
    private static readonly JsonSerializerOptions WeeklyAvailabilityJsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IBookingRepository _repository;

    public ProviderAvailabilityService(IBookingRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<ProviderSlotDto>> GetSlotsAsync(
        Guid providerId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        var fromUtc = from ?? DateTimeOffset.UtcNow;
        var toUtc = to ?? fromUtc.AddDays(30);

        await _repository.ReleaseExpiredHoldsAsync(providerId, null, DateTimeOffset.UtcNow, cancellationToken);
        await GenerateWeeklySlotsAsync(providerId, fromUtc, toUtc, cancellationToken);

        var slots = await _repository.GetAvailableSlotsAsync(providerId, fromUtc, toUtc, MaxSlots, cancellationToken);
        return slots
            .Select(slot => new ProviderSlotDto(slot.Id, slot.ProviderProfileId, slot.StartsAtUtc, slot.EndsAtUtc, slot.Status))
            .ToList();
    }

    /// <summary>
    /// Materializes concrete, bookable one-hour slots for the requested window from the provider's
    /// recurring weekly availability. Idempotent: a slot is only inserted when one does not already
    /// exist for that exact start, so repeated calls and the hold/finalize pipeline stay consistent.
    /// Only published, active providers generate slots.
    /// </summary>
    private async Task GenerateWeeklySlotsAsync(
        Guid providerId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        CancellationToken cancellationToken)
    {
        if (toUtc <= fromUtc)
        {
            return;
        }

        var weeklyJson = await _repository.GetPublishedProviderWeeklyAvailabilityAsync(providerId, cancellationToken);
        var weekly = ParseWeeklyAvailability(weeklyJson);
        if (weekly.Count == 0)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var windowStart = fromUtc < now ? now : fromUtc;
        var existingStarts = await _repository.GetExistingSlotStartsAsync(providerId, now.AddDays(-1), toUtc, cancellationToken);
        var known = new HashSet<DateTimeOffset>(existingStarts);

        // Pad the IST day range by one day each side so slots whose IST civil date differs from the
        // requested UTC date (the +5:30 offset can shift across midnight) are still covered.
        var firstDate = windowStart.ToOffset(IndiaOffset).Date.AddDays(-1);
        var lastDate = toUtc.ToOffset(IndiaOffset).Date.AddDays(1);
        var toAdd = new List<ProviderAvailabilitySlot>();

        for (var date = firstDate; date <= lastDate; date = date.AddDays(1))
        {
            var dayOfWeek = (int)date.DayOfWeek;
            foreach (var entry in weekly.Where(slot => slot.DayOfWeek == dayOfWeek))
            {
                AppendDaySlots(date, entry, providerId, now, windowStart, toUtc, known, toAdd);
            }
        }

        await _repository.AddSlotsAsync(toAdd, cancellationToken);
    }

    private static void AppendDaySlots(
        DateTime istDate,
        WeeklyAvailabilitySlot entry,
        Guid providerId,
        DateTimeOffset now,
        DateTimeOffset windowStart,
        DateTimeOffset windowEnd,
        HashSet<DateTimeOffset> known,
        List<ProviderAvailabilitySlot> toAdd)
    {
        if (!TryParseMinutes(entry.StartTime, out var startMinutes) || !TryParseMinutes(entry.EndTime, out var endMinutes))
        {
            return;
        }

        var midnightIst = new DateTimeOffset(istDate.Year, istDate.Month, istDate.Day, 0, 0, 0, IndiaOffset);
        for (var minute = startMinutes; minute + SessionMinutes <= endMinutes; minute += SessionMinutes)
        {
            var startUtc = midnightIst.AddMinutes(minute).ToUniversalTime();
            if (startUtc < now || startUtc < windowStart || startUtc > windowEnd || !known.Add(startUtc))
            {
                continue;
            }

            toAdd.Add(new ProviderAvailabilitySlot
            {
                ProviderProfileId = providerId,
                StartsAtUtc = startUtc,
                EndsAtUtc = startUtc.AddMinutes(SessionMinutes),
                Status = "Available",
                CreatedAtUtc = now,
            });
        }
    }

    private static IReadOnlyList<WeeklyAvailabilitySlot> ParseWeeklyAvailability(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<IReadOnlyList<WeeklyAvailabilitySlot>>(json, WeeklyAvailabilityJsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static bool TryParseMinutes(string? time, out int minutes)
    {
        minutes = 0;
        if (string.Equals(time, "24:00", StringComparison.Ordinal))
        {
            minutes = 24 * 60;
            return true;
        }

        if (string.IsNullOrWhiteSpace(time) || time.Length != 5 || time[2] != ':')
        {
            return false;
        }

        if (!int.TryParse(time[..2], out var hours) || hours is < 0 or > 23 ||
            !int.TryParse(time[3..], out var mins) || mins is < 0 or > 59)
        {
            return false;
        }

        minutes = (hours * 60) + mins;
        return true;
    }

    private sealed record WeeklyAvailabilitySlot(int DayOfWeek, string StartTime, string EndTime);
}
