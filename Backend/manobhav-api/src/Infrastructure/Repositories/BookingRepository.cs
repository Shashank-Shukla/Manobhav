using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class BookingRepository : IBookingRepository
{
    private readonly ApplicationDbContext _db;

    public BookingRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ProviderAvailabilitySlot>> GetAvailableSlotsAsync(
        Guid providerId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        int take,
        CancellationToken cancellationToken)
    {
        return await _db.ProviderAvailabilitySlots
            .AsNoTracking()
            .Where(slot =>
                slot.ProviderProfileId == providerId &&
                slot.Status == "Available" &&
                slot.StartsAtUtc >= fromUtc &&
                slot.StartsAtUtc <= toUtc)
            .OrderBy(slot => slot.StartsAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public Task<string?> GetPublishedProviderWeeklyAvailabilityAsync(Guid providerId, CancellationToken cancellationToken)
    {
        return _db.ProviderProfiles
            .AsNoTracking()
            .Where(provider => provider.Id == providerId && provider.IsActive && provider.VisibilityStatus == "Published")
            .Select(provider => provider.WeeklyAvailabilityJson)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DateTimeOffset>> GetExistingSlotStartsAsync(
        Guid providerId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        CancellationToken cancellationToken)
    {
        return await _db.ProviderAvailabilitySlots
            .AsNoTracking()
            .Where(slot => slot.ProviderProfileId == providerId && slot.StartsAtUtc >= fromUtc && slot.StartsAtUtc <= toUtc)
            .Select(slot => slot.StartsAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task AddSlotsAsync(IReadOnlyList<ProviderAvailabilitySlot> slots, CancellationToken cancellationToken)
    {
        if (slots.Count == 0)
        {
            return;
        }

        await _db.ProviderAvailabilitySlots.AddRangeAsync(slots, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<ProviderProfile?> GetBookableProviderAsync(Guid providerId, CancellationToken cancellationToken)
    {
        return _db.ProviderProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == providerId && item.VisibilityStatus == "Published" && item.IsActive, cancellationToken);
    }

    public Task<ProviderAvailabilitySlot?> GetSlotByIdAsync(Guid slotId, CancellationToken cancellationToken)
    {
        return _db.ProviderAvailabilitySlots.AsNoTracking().FirstOrDefaultAsync(slot => slot.Id == slotId, cancellationToken);
    }

    public Task<IntakeSubmission?> GetIntakeSubmissionAsync(Guid intakeSubmissionId, CancellationToken cancellationToken)
    {
        return _db.IntakeSubmissions.AsNoTracking().FirstOrDefaultAsync(item => item.Id == intakeSubmissionId, cancellationToken);
    }

    public async Task<bool> TryReserveSlotForHoldAsync(BookingHold hold, DateTimeOffset now, CancellationToken cancellationToken)
    {
        await using var transaction = _db.Database.IsRelational()
            ? await _db.Database.BeginTransactionAsync(cancellationToken)
            : null;

        var reserved = await TryHoldSlotAsync(hold.ProviderProfileId, hold.SlotId, now, cancellationToken);
        if (!reserved)
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }

            return false;
        }

        await _db.BookingHolds.AddAsync(hold, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return true;
    }

    public Task<BookingHold?> GetHoldAsync(Guid holdId, CancellationToken cancellationToken)
    {
        return _db.BookingHolds.FirstOrDefaultAsync(item => item.Id == holdId, cancellationToken);
    }

    public Task<ProviderAvailabilitySlot?> GetHeldSlotAsync(Guid slotId, CancellationToken cancellationToken)
    {
        return _db.ProviderAvailabilitySlots.FirstOrDefaultAsync(item => item.Id == slotId && item.Status == "Held", cancellationToken);
    }

    public async Task AddAppointmentAsync(Appointment appointment, CancellationToken cancellationToken)
    {
        await _db.Appointments.AddAsync(appointment, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task ReleaseExpiredHoldsAsync(Guid providerId, Guid? slotId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var expiredHolds = await _db.BookingHolds
            .Where(hold =>
                hold.ProviderProfileId == providerId &&
                hold.Status == "Active" &&
                hold.ExpiresAtUtc <= now &&
                (slotId == null || hold.SlotId == slotId))
            .ToListAsync(cancellationToken);

        foreach (var hold in expiredHolds)
        {
            await ExpireHoldInternalAsync(hold, now, cancellationToken);
        }

        if (expiredHolds.Count > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task ExpireHoldAsync(BookingHold hold, DateTimeOffset now, CancellationToken cancellationToken)
    {
        await ExpireHoldInternalAsync(hold, now, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task CancelHoldAsync(BookingHold hold, DateTimeOffset now, CancellationToken cancellationToken)
    {
        hold.Status = "Cancelled";
        hold.CancelledAtUtc = now;

        var slot = await _db.ProviderAvailabilitySlots.FirstOrDefaultAsync(item => item.Id == hold.SlotId, cancellationToken);
        if (slot is { Status: "Held" })
        {
            slot.Status = "Available";
            slot.UpdatedAtUtc = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<Appointment?> GetPatientAppointmentAsync(Guid appointmentId, Guid patientUserId, CancellationToken cancellationToken)
    {
        return _db.Appointments
            .FirstOrDefaultAsync(item => item.Id == appointmentId && item.PatientUserId == patientUserId, cancellationToken);
    }

    public async Task CancelAppointmentAsync(Appointment appointment, DateTimeOffset now, CancellationToken cancellationToken)
    {
        appointment.Status = "Cancelled";
        appointment.CancelledAtUtc = now;
        appointment.UpdatedAtUtc = now;
        await ReleaseBookedSlotAsync(appointment.SlotId, now, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> TryMoveAppointmentAsync(
        Appointment appointment,
        Guid targetSlotId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        await using var transaction = _db.Database.IsRelational()
            ? await _db.Database.BeginTransactionAsync(cancellationToken)
            : null;

        var target = await TryBookSlotAsync(appointment.ProviderProfileId, targetSlotId, now, cancellationToken);
        if (target is null)
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }

            return false;
        }

        await ReleaseBookedSlotAsync(appointment.SlotId, now, cancellationToken);
        appointment.SlotId = target.Id;
        appointment.StartsAtUtc = target.StartsAtUtc;
        appointment.EndsAtUtc = target.EndsAtUtc;
        appointment.UpdatedAtUtc = now;
        await _db.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return true;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        return _db.SaveChangesAsync(cancellationToken);
    }

    private async Task ReleaseBookedSlotAsync(Guid slotId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var slot = await _db.ProviderAvailabilitySlots.FirstOrDefaultAsync(item => item.Id == slotId, cancellationToken);
        if (slot is null || slot.Status == "Available")
        {
            return;
        }

        slot.Status = "Available";
        slot.UpdatedAtUtc = now;
    }

    /// <summary>
    /// Claims an available future slot for the provider by flipping it straight to Booked. Uses a
    /// single conditional update on relational providers so two concurrent reschedules cannot both win.
    /// </summary>
    private async Task<ProviderAvailabilitySlot?> TryBookSlotAsync(
        Guid providerId,
        Guid slotId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (_db.Database.IsRelational())
        {
            var updated = await _db.ProviderAvailabilitySlots
                .Where(item =>
                    item.Id == slotId &&
                    item.ProviderProfileId == providerId &&
                    item.Status == "Available" &&
                    item.StartsAtUtc > now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(slot => slot.Status, "Booked")
                    .SetProperty(slot => slot.UpdatedAtUtc, now), cancellationToken);
            return updated == 1
                ? await _db.ProviderAvailabilitySlots.FirstOrDefaultAsync(item => item.Id == slotId, cancellationToken)
                : null;
        }

        var slot = await _db.ProviderAvailabilitySlots
            .FirstOrDefaultAsync(item => item.Id == slotId && item.ProviderProfileId == providerId, cancellationToken);
        if (slot is null || slot.Status != "Available" || slot.StartsAtUtc <= now)
        {
            return null;
        }

        slot.Status = "Booked";
        slot.UpdatedAtUtc = now;
        return slot;
    }

    private async Task<bool> TryHoldSlotAsync(Guid providerId, Guid slotId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (_db.Database.IsRelational())
        {
            var updated = await _db.ProviderAvailabilitySlots
                .Where(item =>
                    item.Id == slotId &&
                    item.ProviderProfileId == providerId &&
                    item.Status == "Available" &&
                    item.StartsAtUtc > now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(slot => slot.Status, "Held")
                    .SetProperty(slot => slot.UpdatedAtUtc, now), cancellationToken);
            return updated == 1;
        }

        var slot = await _db.ProviderAvailabilitySlots
            .FirstOrDefaultAsync(item => item.Id == slotId && item.ProviderProfileId == providerId, cancellationToken);
        if (slot is null || slot.Status != "Available" || slot.StartsAtUtc <= now)
        {
            return false;
        }

        slot.Status = "Held";
        slot.UpdatedAtUtc = now;
        return true;
    }

    private async Task ExpireHoldInternalAsync(BookingHold hold, DateTimeOffset now, CancellationToken cancellationToken)
    {
        hold.Status = "Expired";
        hold.UpdatedAtUtc = now;

        var slot = await _db.ProviderAvailabilitySlots.FirstOrDefaultAsync(item => item.Id == hold.SlotId, cancellationToken);
        if (slot is not { Status: "Held" })
        {
            return;
        }

        var hasCurrentActiveHold = await _db.BookingHolds.AnyAsync(item =>
            item.Id != hold.Id &&
            item.SlotId == hold.SlotId &&
            item.Status == "Active" &&
            item.ExpiresAtUtc > now, cancellationToken);
        if (hasCurrentActiveHold)
        {
            return;
        }

        slot.Status = "Available";
        slot.UpdatedAtUtc = now;
    }
}
