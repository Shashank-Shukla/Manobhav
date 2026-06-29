using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Domain.Entities;

namespace Application.Services;

/// <summary>Raised by the booking workflow; the WebApi layer maps <see cref="StatusCode"/> to HTTP.</summary>
public sealed class BookingException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public sealed class BookingService : IBookingService
{
    private static readonly TimeSpan HoldDuration = TimeSpan.FromMinutes(15);

    private readonly IBookingRepository _repository;

    public BookingService(IBookingRepository repository)
    {
        _repository = repository;
    }

    public async Task<BookingHoldDto> CreateHoldAsync(
        CreateBookingHoldRequest request,
        BookingOwnerContext owner,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        if (!HasOwnerContext(owner))
        {
            throw new BookingException("Booking owner context is required.", 400);
        }

        var now = DateTimeOffset.UtcNow;
        await _repository.ReleaseExpiredHoldsAsync(request.ProviderId, request.SlotId, now, cancellationToken);

        var provider = await _repository.GetBookableProviderAsync(request.ProviderId, cancellationToken)
            ?? throw new BookingException("Provider is not available for booking.", 400);

        var submission = await _repository.GetIntakeSubmissionAsync(request.IntakeSubmissionId, cancellationToken);
        if (submission is null || !IntakeBelongsToOwner(submission, owner))
        {
            throw new BookingException("Intake submission is required before booking.", 400);
        }

        var slot = await _repository.GetSlotByIdAsync(request.SlotId, cancellationToken);
        if (slot is null)
        {
            throw new BookingException("Selected slot is not available.", 409);
        }

        var hold = new BookingHold
        {
            ProviderProfileId = provider.Id,
            SlotId = slot.Id,
            VisitorSessionId = owner.VisitorSessionId,
            UserId = owner.UserId,
            IntakeSubmissionId = request.IntakeSubmissionId,
            ExpiresAtUtc = now.Add(HoldDuration),
            ProviderSnapshotJson = JsonSerializer.Serialize(new { provider.Id, Name = provider.DisplayName ?? provider.Name, provider.ProfessionalTitle }),
            SelectedSlotSnapshotJson = JsonSerializer.Serialize(new { slot.Id, slot.StartsAtUtc, slot.EndsAtUtc }),
            IpAddress = ipAddress,
            UserAgent = userAgent,
        };

        if (!await _repository.TryReserveSlotForHoldAsync(hold, now, cancellationToken))
        {
            throw new BookingException("Selected slot is not available.", 409);
        }

        return ToDto(hold);
    }

    public async Task<BookingHoldDto?> GetHoldAsync(Guid holdId, BookingOwnerContext owner, CancellationToken cancellationToken)
    {
        var hold = await _repository.GetHoldAsync(holdId, cancellationToken);
        if (hold is null || !HoldBelongsToOwner(hold, owner))
        {
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        if (IsExpiredActiveHold(hold, now))
        {
            await _repository.ExpireHoldAsync(hold, now, cancellationToken);
        }

        return ToDto(hold);
    }

    public async Task<BookingHoldDto?> PatchFlowStateAsync(Guid holdId, BookingOwnerContext owner, string? flowStateJson, CancellationToken cancellationToken)
    {
        var hold = await _repository.GetHoldAsync(holdId, cancellationToken);
        if (hold is null || !HoldBelongsToOwner(hold, owner))
        {
            return null;
        }

        hold.FlowStateJson = string.IsNullOrWhiteSpace(flowStateJson) ? "{}" : flowStateJson;
        hold.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await _repository.SaveChangesAsync(cancellationToken);
        return ToDto(hold);
    }

    public async Task<AppointmentDto> FinalizeAsync(Guid holdId, Guid userId, Guid? visitorSessionId, CancellationToken cancellationToken)
    {
        var owner = new BookingOwnerContext(userId, visitorSessionId);
        var hold = await _repository.GetHoldAsync(holdId, cancellationToken);
        if (hold is null || !HoldBelongsToOwner(hold, owner))
        {
            throw new BookingException("Booking hold is not active.", 409);
        }

        var now = DateTimeOffset.UtcNow;
        if (IsExpiredActiveHold(hold, now))
        {
            await _repository.ExpireHoldAsync(hold, now, cancellationToken);
            throw new BookingException("Booking hold is not active.", 409);
        }

        if (hold.Status is "Completed" or "Cancelled" or "Expired")
        {
            throw new BookingException("Booking hold is not active.", 409);
        }

        var slot = await _repository.GetHeldSlotAsync(hold.SlotId, cancellationToken)
            ?? throw new BookingException("Held slot is not available for finalization.", 409);

        slot.Status = "Booked";
        slot.UpdatedAtUtc = now;
        hold.UserId = userId;
        hold.Status = "Completed";
        hold.CompletedAtUtc = now;

        var appointment = new Appointment
        {
            BookingHoldId = hold.Id,
            PatientUserId = userId,
            ProviderProfileId = hold.ProviderProfileId,
            SlotId = slot.Id,
            IntakeSubmissionId = hold.IntakeSubmissionId ?? Guid.Empty,
            StartsAtUtc = slot.StartsAtUtc,
            EndsAtUtc = slot.EndsAtUtc,
            Status = "Scheduled",
            PaymentStatus = "NotRequired",
        };
        await _repository.AddAppointmentAsync(appointment, cancellationToken);

        return new AppointmentDto(
            appointment.Id,
            appointment.BookingHoldId,
            appointment.PatientUserId,
            appointment.ProviderProfileId,
            appointment.SlotId,
            appointment.IntakeSubmissionId,
            appointment.StartsAtUtc,
            appointment.EndsAtUtc,
            appointment.Status,
            appointment.PaymentStatus);
    }

    public async Task CancelHoldAsync(Guid holdId, BookingOwnerContext owner, CancellationToken cancellationToken)
    {
        var hold = await _repository.GetHoldAsync(holdId, cancellationToken);
        if (hold is null || !HoldBelongsToOwner(hold, owner))
        {
            return;
        }

        await _repository.CancelHoldAsync(hold, DateTimeOffset.UtcNow, cancellationToken);
    }

    private static bool HasOwnerContext(BookingOwnerContext owner)
    {
        return owner.UserId.HasValue || owner.VisitorSessionId.HasValue;
    }

    private static bool HoldBelongsToOwner(BookingHold hold, BookingOwnerContext owner)
    {
        return HoldBelongsToUser(hold, owner) || HoldBelongsToVisitor(hold, owner);
    }

    private static bool HoldBelongsToUser(BookingHold hold, BookingOwnerContext owner)
    {
        return hold.UserId.HasValue && hold.UserId == owner.UserId;
    }

    private static bool HoldBelongsToVisitor(BookingHold hold, BookingOwnerContext owner)
    {
        return !hold.UserId.HasValue &&
            hold.VisitorSessionId.HasValue &&
            hold.VisitorSessionId == owner.VisitorSessionId;
    }

    private static bool IntakeBelongsToOwner(IntakeSubmission submission, BookingOwnerContext owner)
    {
        var belongsToUser = submission.UserId.HasValue && submission.UserId == owner.UserId;
        var belongsToVisitor = !submission.UserId.HasValue &&
            submission.VisitorSessionId.HasValue &&
            submission.VisitorSessionId == owner.VisitorSessionId;
        return belongsToUser || belongsToVisitor;
    }

    private static bool IsExpiredActiveHold(BookingHold hold, DateTimeOffset now)
    {
        return hold.Status == "Active" && hold.ExpiresAtUtc <= now;
    }

    private static BookingHoldDto ToDto(BookingHold hold)
    {
        return new BookingHoldDto(
            hold.Id,
            hold.ProviderProfileId,
            hold.SlotId,
            hold.VisitorSessionId,
            hold.UserId,
            hold.IntakeSubmissionId,
            hold.Status,
            hold.ExpiresAtUtc);
    }
}
