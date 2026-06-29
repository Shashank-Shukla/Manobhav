using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/booking")]
public sealed class BookingController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IBookingService _booking;
    private readonly IProviderAvailabilityService _availability;

    public BookingController(ApplicationDbContext db, IBookingService booking, IProviderAvailabilityService availability)
    {
        _db = db;
        _booking = booking;
        _availability = availability;
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
        return Ok(await _availability.GetSlotsAsync(providerId, from, to, cancellationToken));
    }

    [AllowAnonymous]
    [HttpPost("holds")]
    [ProducesResponseType(typeof(BookingHoldDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateHold(CreateBookingHoldRequest request, CancellationToken cancellationToken)
    {
        var owner = await ReadOwnerContextAsync(cancellationToken);
        try
        {
            var hold = await _booking.CreateHoldAsync(
                request,
                owner,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString(),
                cancellationToken);
            return Created($"/api/booking/holds/{hold.Id}", hold);
        }
        catch (BookingException exception)
        {
            return Problem(title: exception.Message, statusCode: exception.StatusCode);
        }
    }

    [AllowAnonymous]
    [HttpGet("holds/{holdId:guid}")]
    [ProducesResponseType(typeof(BookingHoldDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHold(Guid holdId, CancellationToken cancellationToken)
    {
        var owner = await ReadOwnerContextAsync(cancellationToken);
        var hold = await _booking.GetHoldAsync(holdId, owner, cancellationToken);
        return hold is null ? NotFound() : Ok(hold);
    }

    [AllowAnonymous]
    [HttpPatch("holds/{holdId:guid}/flow-state")]
    [ProducesResponseType(typeof(BookingHoldDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PatchFlowState(Guid holdId, PatchBookingHoldFlowStateRequest request, CancellationToken cancellationToken)
    {
        var owner = await ReadOwnerContextAsync(cancellationToken);
        var hold = await _booking.PatchFlowStateAsync(holdId, owner, request.FlowStateJson, cancellationToken);
        return hold is null ? NotFound() : Ok(hold);
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

        try
        {
            var appointment = await _booking.FinalizeAsync(holdId, user.Id, TryReadVisitorCookie(), cancellationToken);
            return Created($"/api/appointments/{appointment.Id}", appointment);
        }
        catch (BookingException exception)
        {
            return Problem(title: exception.Message, statusCode: exception.StatusCode);
        }
    }

    [AllowAnonymous]
    [HttpDelete("holds/{holdId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> CancelHold(Guid holdId, CancellationToken cancellationToken)
    {
        var owner = await ReadOwnerContextAsync(cancellationToken);
        await _booking.CancelHoldAsync(holdId, owner, cancellationToken);
        return NoContent();
    }

    private async Task<BookingOwnerContext> ReadOwnerContextAsync(CancellationToken cancellationToken)
    {
        var user = User.Identity?.IsAuthenticated == true
            ? await EnsureCurrentUserAsync(cancellationToken)
            : null;
        return new BookingOwnerContext(user?.Id, TryReadVisitorCookie());
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

    private Guid? TryReadVisitorCookie()
    {
        return Request.Cookies.TryGetValue("mbv_vid", out var value) && Guid.TryParse(value, out var visitorId)
            ? visitorId
            : null;
    }
}
