using System.Text.Json;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace WebApi.Controllers;

[ApiController]
[Route("api/booking")]
public sealed class BookingController : ControllerBase
{
    private static readonly TimeSpan HoldDuration = TimeSpan.FromMinutes(15);
    private readonly ApplicationDbContext _db;

    public BookingController(ApplicationDbContext db)
    {
        _db = db;
    }

    [AllowAnonymous]
    [HttpGet("/api/public/providers/{providerId:guid}/slots")]
    [ProducesResponseType(typeof(IReadOnlyList<ProviderSlotDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProviderSlotDto>>> GetProviderSlots(
        Guid providerId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        var fromUtc = from ?? DateTimeOffset.UtcNow;
        var toUtc = to ?? fromUtc.AddDays(30);
        await ReleaseExpiredHoldsAsync(providerId, null, cancellationToken);

        var slots = await _db.ProviderAvailabilitySlots
            .AsNoTracking()
            .Where(slot =>
                slot.ProviderProfileId == providerId &&
                slot.Status == "Available" &&
                slot.StartsAtUtc >= fromUtc &&
                slot.StartsAtUtc <= toUtc)
            .OrderBy(slot => slot.StartsAtUtc)
            .Take(100)
            .Select(slot => new ProviderSlotDto(slot.Id, slot.ProviderProfileId, slot.StartsAtUtc, slot.EndsAtUtc, slot.Status))
            .ToListAsync(cancellationToken);

        return Ok(slots);
    }

    [AllowAnonymous]
    [HttpPost("holds")]
    [ProducesResponseType(typeof(BookingHoldDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateHold(CreateBookingHoldRequest request, CancellationToken cancellationToken)
    {
        var owner = await ReadOwnerContextAsync(cancellationToken);
        if (!HasOwnerContext(owner))
        {
            return Problem(title: "Booking owner context is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        await ReleaseExpiredHoldsAsync(request.ProviderId, request.SlotId, cancellationToken);

        var provider = await _db.ProviderProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.ProviderId && item.VisibilityStatus == "Published" && item.IsActive, cancellationToken);
        if (provider is null)
        {
            return Problem(title: "Provider is not available for booking.", statusCode: StatusCodes.Status400BadRequest);
        }

        if (!await IntakeSubmissionBelongsToOwnerAsync(request.IntakeSubmissionId, owner, cancellationToken))
        {
            return Problem(title: "Intake submission is required before booking.", statusCode: StatusCodes.Status400BadRequest);
        }

        await using var transaction = await BeginRelationalTransactionAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var slot = await TryHoldSlotAsync(request.ProviderId, request.SlotId, now, cancellationToken);
        if (slot is null)
        {
            return Problem(title: "Selected slot is not available.", statusCode: StatusCodes.Status409Conflict);
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
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString()
        };
        await _db.BookingHolds.AddAsync(hold, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        await CommitTransactionAsync(transaction, cancellationToken);

        return Created($"/api/booking/holds/{hold.Id}", ToDto(hold));
    }

    [AllowAnonymous]
    [HttpGet("holds/{holdId:guid}")]
    [ProducesResponseType(typeof(BookingHoldDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHold(Guid holdId, CancellationToken cancellationToken)
    {
        var owner = await ReadOwnerContextAsync(cancellationToken);
        var hold = await _db.BookingHolds.FirstOrDefaultAsync(item => item.Id == holdId, cancellationToken);
        if (hold is null || !HoldBelongsToOwner(hold, owner))
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        if (IsExpiredActiveHold(hold, now))
        {
            await ExpireHoldAsync(hold, now, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return Ok(ToDto(hold));
    }

    [AllowAnonymous]
    [HttpPatch("holds/{holdId:guid}/flow-state")]
    [ProducesResponseType(typeof(BookingHoldDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PatchFlowState(Guid holdId, PatchBookingHoldFlowStateRequest request, CancellationToken cancellationToken)
    {
        var owner = await ReadOwnerContextAsync(cancellationToken);
        var hold = await _db.BookingHolds.FirstOrDefaultAsync(item => item.Id == holdId, cancellationToken);
        if (hold is null || !HoldBelongsToOwner(hold, owner))
        {
            return NotFound();
        }

        hold.FlowStateJson = string.IsNullOrWhiteSpace(request.FlowStateJson) ? "{}" : request.FlowStateJson;
        hold.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(hold));
    }

    [Authorize]
    [HttpPost("holds/{holdId:guid}/finalize")]
    [ProducesResponseType(typeof(AppointmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> FinalizeAppointment(Guid holdId, CancellationToken cancellationToken)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Problem(title: "Authenticated user subject is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        return await FinalizeOwnedAppointmentAsync(holdId, user, cancellationToken);
    }

    private async Task<IActionResult> FinalizeOwnedAppointmentAsync(
        Guid holdId,
        User user,
        CancellationToken cancellationToken)
    {
        var owner = new BookingOwnerContext(user.Id, TryReadVisitorCookie());
        var hold = await FindOwnedHoldAsync(holdId, owner, cancellationToken);
        if (hold is null)
        {
            return Problem(title: "Booking hold is not active.", statusCode: StatusCodes.Status409Conflict);
        }

        var now = DateTimeOffset.UtcNow;
        if (IsExpiredActiveHold(hold, now))
        {
            await ExpireHoldAsync(hold, now, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            return Problem(title: "Booking hold is not active.", statusCode: StatusCodes.Status409Conflict);
        }

        if (hold.Status is "Completed" or "Cancelled" or "Expired")
        {
            return Problem(title: "Booking hold is not active.", statusCode: StatusCodes.Status409Conflict);
        }

        var slot = await FindHeldSlotAsync(hold.SlotId, cancellationToken);
        if (slot is null)
        {
            return Problem(title: "Held slot is not available for finalization.", statusCode: StatusCodes.Status409Conflict);
        }

        slot.Status = "Booked";
        slot.UpdatedAtUtc = now;
        hold.UserId = user.Id;
        hold.Status = "Completed";
        hold.CompletedAtUtc = now;

        var appointment = new Appointment
        {
            BookingHoldId = hold.Id,
            PatientUserId = user.Id,
            ProviderProfileId = hold.ProviderProfileId,
            SlotId = slot.Id,
            IntakeSubmissionId = hold.IntakeSubmissionId ?? Guid.Empty,
            StartsAtUtc = slot.StartsAtUtc,
            EndsAtUtc = slot.EndsAtUtc,
            Status = "Scheduled",
            PaymentStatus = "NotRequired"
        };
        await _db.Appointments.AddAsync(appointment, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        return Created($"/api/appointments/{appointment.Id}", new AppointmentDto(
            appointment.Id,
            appointment.BookingHoldId,
            appointment.PatientUserId,
            appointment.ProviderProfileId,
            appointment.SlotId,
            appointment.IntakeSubmissionId,
            appointment.StartsAtUtc,
            appointment.EndsAtUtc,
            appointment.Status,
            appointment.PaymentStatus));
    }

    [AllowAnonymous]
    [HttpDelete("holds/{holdId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> CancelHold(Guid holdId, CancellationToken cancellationToken)
    {
        var owner = await ReadOwnerContextAsync(cancellationToken);
        var hold = await _db.BookingHolds.FirstOrDefaultAsync(item => item.Id == holdId, cancellationToken);
        if (hold is null || !HoldBelongsToOwner(hold, owner))
        {
            return NoContent();
        }

        hold.Status = "Cancelled";
        hold.CancelledAtUtc = DateTimeOffset.UtcNow;
        var slot = await _db.ProviderAvailabilitySlots.FirstOrDefaultAsync(item => item.Id == hold.SlotId, cancellationToken);
        if (slot is { Status: "Held" })
        {
            slot.Status = "Available";
            slot.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<ProviderAvailabilitySlot?> TryHoldSlotAsync(
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
                    .SetProperty(slot => slot.Status, "Held")
                    .SetProperty(slot => slot.UpdatedAtUtc, now), cancellationToken);

            return updated == 1
                ? await _db.ProviderAvailabilitySlots.AsNoTracking().FirstAsync(item => item.Id == slotId, cancellationToken)
                : null;
        }

        var slot = await _db.ProviderAvailabilitySlots
            .FirstOrDefaultAsync(item => item.Id == slotId && item.ProviderProfileId == providerId, cancellationToken);
        if (slot is null || slot.Status != "Available" || slot.StartsAtUtc <= now)
        {
            return null;
        }

        slot.Status = "Held";
        slot.UpdatedAtUtc = now;
        return slot;
    }

    private async Task<IDbContextTransaction?> BeginRelationalTransactionAsync(CancellationToken cancellationToken)
    {
        return _db.Database.IsRelational()
            ? await _db.Database.BeginTransactionAsync(cancellationToken)
            : null;
    }

    private static async Task CommitTransactionAsync(IDbContextTransaction? transaction, CancellationToken cancellationToken)
    {
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }
    }

    private async Task ReleaseExpiredHoldsAsync(Guid providerId, Guid? slotId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var expiredHolds = await _db.BookingHolds
            .Where(hold =>
                hold.ProviderProfileId == providerId &&
                hold.Status == "Active" &&
                hold.ExpiresAtUtc <= now &&
                (slotId == null || hold.SlotId == slotId))
            .ToListAsync(cancellationToken);

        foreach (var hold in expiredHolds)
        {
            await ExpireHoldAsync(hold, now, cancellationToken);
        }

        if (expiredHolds.Count > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task ExpireHoldAsync(BookingHold hold, DateTimeOffset now, CancellationToken cancellationToken)
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

    private static bool IsExpiredActiveHold(BookingHold hold, DateTimeOffset now)
    {
        return hold.Status == "Active" && hold.ExpiresAtUtc <= now;
    }

    private async Task<User?> EnsureCurrentUserAsync(CancellationToken cancellationToken)
    {
        var subject = User.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(subject))
        {
            return null;
        }

        var user = await _db.Users.FirstOrDefaultAsync(item => item.CognitoSubject == subject, cancellationToken);
        if (user is not null)
        {
            return user;
        }

        user = new User
        {
            CognitoSubject = subject,
            Email = User.FindFirst("email")?.Value,
            DisplayName = User.Identity?.Name
        };
        await _db.Users.AddAsync(user, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return user;
    }

    private async Task<BookingOwnerContext> ReadOwnerContextAsync(CancellationToken cancellationToken)
    {
        var user = User.Identity?.IsAuthenticated == true
            ? await EnsureCurrentUserAsync(cancellationToken)
            : null;
        return new BookingOwnerContext(user?.Id, TryReadVisitorCookie());
    }

    private async Task<bool> IntakeSubmissionBelongsToOwnerAsync(
        Guid intakeSubmissionId,
        BookingOwnerContext owner,
        CancellationToken cancellationToken)
    {
        var submission = await _db.IntakeSubmissions
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == intakeSubmissionId, cancellationToken);
        return submission is not null &&
            (IntakeBelongsToUser(submission, owner) || IntakeBelongsToVisitor(submission, owner));
    }

    private async Task<BookingHold?> FindOwnedHoldAsync(
        Guid holdId,
        BookingOwnerContext owner,
        CancellationToken cancellationToken)
    {
        var hold = await _db.BookingHolds.FirstOrDefaultAsync(item => item.Id == holdId, cancellationToken);
        return hold is not null && HoldBelongsToOwner(hold, owner) ? hold : null;
    }

    private Task<ProviderAvailabilitySlot?> FindHeldSlotAsync(Guid slotId, CancellationToken cancellationToken)
    {
        return _db.ProviderAvailabilitySlots
            .FirstOrDefaultAsync(item => item.Id == slotId && item.Status == "Held", cancellationToken);
    }

    private Guid? TryReadVisitorCookie()
    {
        return Request.Cookies.TryGetValue("mbv_vid", out var value) && Guid.TryParse(value, out var visitorId)
            ? visitorId
            : null;
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

    private static bool IntakeBelongsToUser(IntakeSubmission submission, BookingOwnerContext owner)
    {
        return submission.UserId.HasValue && submission.UserId == owner.UserId;
    }

    private static bool IntakeBelongsToVisitor(IntakeSubmission submission, BookingOwnerContext owner)
    {
        return !submission.UserId.HasValue &&
            submission.VisitorSessionId.HasValue &&
            submission.VisitorSessionId == owner.VisitorSessionId;
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

    private sealed record BookingOwnerContext(Guid? UserId, Guid? VisitorSessionId);
}
