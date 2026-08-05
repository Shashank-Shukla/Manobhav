using Domain.Entities;

namespace Application.Interfaces;

/// <summary>
/// Data access for booking: provider availability slots (read + on-demand generation), booking
/// holds (reserve/expire/cancel), and appointment finalization. Hides EF Core specifics — atomic
/// slot reservation, the relational transaction, and concurrency — from the application services.
/// </summary>
public interface IBookingRepository
{
    Task<IReadOnlyList<ProviderAvailabilitySlot>> GetAvailableSlotsAsync(
        Guid providerId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        int take,
        CancellationToken cancellationToken);

    /// <summary>Weekly availability JSON for a published, active provider; null if not bookable.</summary>
    Task<string?> GetPublishedProviderWeeklyAvailabilityAsync(Guid providerId, CancellationToken cancellationToken);

    Task<IReadOnlyList<DateTimeOffset>> GetExistingSlotStartsAsync(
        Guid providerId,
        DateTimeOffset fromUtc,
        DateTimeOffset toUtc,
        CancellationToken cancellationToken);

    Task AddSlotsAsync(IReadOnlyList<ProviderAvailabilitySlot> slots, CancellationToken cancellationToken);

    Task<ProviderProfile?> GetBookableProviderAsync(Guid providerId, CancellationToken cancellationToken);

    Task<ProviderAvailabilitySlot?> GetSlotByIdAsync(Guid slotId, CancellationToken cancellationToken);

    Task<IntakeSubmission?> GetIntakeSubmissionAsync(Guid intakeSubmissionId, CancellationToken cancellationToken);

    /// <summary>
    /// Atomically reserves the slot (Available → Held) and persists the hold in one transaction.
    /// Returns false (nothing persisted) when the slot is no longer available.
    /// </summary>
    Task<bool> TryReserveSlotForHoldAsync(BookingHold hold, DateTimeOffset now, CancellationToken cancellationToken);

    Task<BookingHold?> GetHoldAsync(Guid holdId, CancellationToken cancellationToken);

    Task<ProviderAvailabilitySlot?> GetHeldSlotAsync(Guid slotId, CancellationToken cancellationToken);

    Task AddAppointmentAsync(Appointment appointment, CancellationToken cancellationToken);

    /// <summary>Expires active holds past their TTL, freeing each slot unless another active hold holds it.</summary>
    Task ReleaseExpiredHoldsAsync(Guid providerId, Guid? slotId, DateTimeOffset now, CancellationToken cancellationToken);

    /// <summary>Expires a single hold (freeing its slot when no other active hold holds it) and saves.</summary>
    Task ExpireHoldAsync(BookingHold hold, DateTimeOffset now, CancellationToken cancellationToken);

    /// <summary>Cancels a hold and frees its slot (if still held), then saves.</summary>
    Task CancelHoldAsync(BookingHold hold, DateTimeOffset now, CancellationToken cancellationToken);

    /// <summary>Tracked appointment owned by the given patient; null when missing or not owned.</summary>
    Task<Appointment?> GetPatientAppointmentAsync(Guid appointmentId, Guid patientUserId, CancellationToken cancellationToken);

    /// <summary>Cancels the appointment and releases its booked slot back to available, then saves.</summary>
    Task CancelAppointmentAsync(Appointment appointment, DateTimeOffset now, CancellationToken cancellationToken);

    /// <summary>
    /// Atomically books <paramref name="targetSlotId"/> and releases the appointment's current slot in
    /// one transaction. Returns false (nothing persisted) when the target slot is no longer available.
    /// </summary>
    Task<bool> TryMoveAppointmentAsync(
        Appointment appointment,
        Guid targetSlotId,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
