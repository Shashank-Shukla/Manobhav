using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class DiagnosticsRepository : IDiagnosticsRepository
{
    private readonly ApplicationDbContext _db;

    public DiagnosticsRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyDictionary<string, int>> GetTableCountsAsync(IReadOnlyList<string> tables, CancellationToken cancellationToken)
    {
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var table in tables)
        {
            counts[table] = table switch
            {
                "users" => await _db.Users.CountAsync(cancellationToken),
                "provider-profiles" => await _db.ProviderProfiles.CountAsync(cancellationToken),
                "provider-applications" => await _db.ProviderOnboardingApplications.CountAsync(cancellationToken),
                "availability-slots" => await _db.ProviderAvailabilitySlots.CountAsync(cancellationToken),
                "appointments" => await _db.Appointments.CountAsync(cancellationToken),
                "booking-holds" => await _db.BookingHolds.CountAsync(cancellationToken),
                "user-roles" => await _db.UserRoles.CountAsync(cancellationToken),
                _ => 0,
            };
        }

        return counts;
    }

    public async Task<IReadOnlyList<User>> GetUsersAsync(int limit, int offset, CancellationToken cancellationToken)
    {
        return await _db.Users.AsNoTracking()
            .OrderByDescending(item => item.CreatedAtUtc).Skip(offset).Take(limit).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProviderProfile>> GetProviderProfilesAsync(int limit, int offset, CancellationToken cancellationToken)
    {
        return await _db.ProviderProfiles.AsNoTracking()
            .OrderByDescending(item => item.CreatedAtUtc).Skip(offset).Take(limit).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProviderOnboardingApplication>> GetProviderApplicationsAsync(int limit, int offset, CancellationToken cancellationToken)
    {
        return await _db.ProviderOnboardingApplications.AsNoTracking()
            .OrderByDescending(item => item.CreatedAtUtc).Skip(offset).Take(limit).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ProviderAvailabilitySlot>> GetAvailabilitySlotsAsync(int limit, int offset, CancellationToken cancellationToken)
    {
        return await _db.ProviderAvailabilitySlots.AsNoTracking()
            .OrderBy(item => item.StartsAtUtc).Skip(offset).Take(limit).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Appointment>> GetAppointmentsAsync(int limit, int offset, CancellationToken cancellationToken)
    {
        return await _db.Appointments.AsNoTracking()
            .OrderByDescending(item => item.StartsAtUtc).Skip(offset).Take(limit).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BookingHold>> GetBookingHoldsAsync(int limit, int offset, CancellationToken cancellationToken)
    {
        return await _db.BookingHolds.AsNoTracking()
            .OrderByDescending(item => item.ExpiresAtUtc).Skip(offset).Take(limit).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserRole>> GetUserRolesAsync(int limit, int offset, CancellationToken cancellationToken)
    {
        return await _db.UserRoles.AsNoTracking()
            .OrderBy(item => item.Role).Skip(offset).Take(limit).ToListAsync(cancellationToken);
    }
}
