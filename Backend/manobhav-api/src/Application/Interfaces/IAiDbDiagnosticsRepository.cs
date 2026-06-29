using Domain.Entities;

namespace Application.Interfaces;

/// <summary>
/// Read-only, paged access to the operational tables surfaced by the diagnostics endpoint. Returns
/// entities; the service redacts them. Sensitive tables are deliberately not represented here.
/// </summary>
public interface IAiDbDiagnosticsRepository
{
    Task<IReadOnlyDictionary<string, int>> GetTableCountsAsync(IReadOnlyList<string> tables, CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> GetUsersAsync(int limit, int offset, CancellationToken cancellationToken);

    Task<IReadOnlyList<ProviderProfile>> GetProviderProfilesAsync(int limit, int offset, CancellationToken cancellationToken);

    Task<IReadOnlyList<ProviderOnboardingApplication>> GetProviderApplicationsAsync(int limit, int offset, CancellationToken cancellationToken);

    Task<IReadOnlyList<ProviderAvailabilitySlot>> GetAvailabilitySlotsAsync(int limit, int offset, CancellationToken cancellationToken);

    Task<IReadOnlyList<Appointment>> GetAppointmentsAsync(int limit, int offset, CancellationToken cancellationToken);

    Task<IReadOnlyList<BookingHold>> GetBookingHoldsAsync(int limit, int offset, CancellationToken cancellationToken);

    Task<IReadOnlyList<UserRole>> GetUserRolesAsync(int limit, int offset, CancellationToken cancellationToken);
}
