using Application.DTOs;

namespace Application.Interfaces;

/// <summary>Identifies who owns a booking: a signed-in user, an anonymous visitor session, or both.</summary>
public sealed record BookingOwnerContext(Guid? UserId, Guid? VisitorSessionId);

/// <summary>
/// Booking workflow: reserve a hold on a slot, read/patch a hold, finalize a hold into an
/// appointment, and cancel a hold. Owns the business rules; throws
/// <see cref="Application.Services.BookingException"/> for non-success outcomes, and returns null
/// for "not found / not owned" reads.
/// </summary>
public interface IBookingService
{
    Task<BookingHoldDto> CreateHoldAsync(
        CreateBookingHoldRequest request,
        BookingOwnerContext owner,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken);

    Task<BookingHoldDto?> GetHoldAsync(Guid holdId, BookingOwnerContext owner, CancellationToken cancellationToken);

    Task<BookingHoldDto?> PatchFlowStateAsync(Guid holdId, BookingOwnerContext owner, string? flowStateJson, CancellationToken cancellationToken);

    Task<AppointmentDto> FinalizeAsync(Guid holdId, Guid userId, Guid? visitorSessionId, CancellationToken cancellationToken);

    Task CancelHoldAsync(Guid holdId, BookingOwnerContext owner, CancellationToken cancellationToken);
}
