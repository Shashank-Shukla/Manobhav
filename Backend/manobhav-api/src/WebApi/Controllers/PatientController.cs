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
[Authorize]
[Route("api/patient")]
public sealed class PatientController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IPatientService _patientService;
    private readonly IBookingService _booking;

    public PatientController(ApplicationDbContext db, IPatientService patientService, IBookingService booking)
    {
        _db = db;
        _patientService = patientService;
        _booking = booking;
    }

    [HttpGet("onboarding-status")]
    [ProducesResponseType(typeof(PatientOnboardingStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOnboardingStatus(CancellationToken cancellationToken = default)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Problem(title: "Authenticated user subject is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            var status = await _patientService.GetOnboardingStatusAsync(user.Id, cancellationToken);
            return Ok(status);
        }
        catch (PatientException exception)
        {
            return Problem(title: exception.Message, statusCode: exception.StatusCode);
        }
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(PatientDashboardDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken = default)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Problem(title: "Authenticated user subject is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            var dashboard = await _patientService.GetDashboardAsync(user.Id, cancellationToken);
            return Ok(dashboard);
        }
        catch (PatientException exception)
        {
            return Problem(title: exception.Message, statusCode: exception.StatusCode);
        }
    }

    [HttpPut("profile")]
    [ProducesResponseType(typeof(PatientProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile(UpdatePatientProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Problem(title: "Authenticated user subject is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            var profile = await _patientService.UpdateProfileAsync(user.Id, request, cancellationToken);
            return Ok(profile);
        }
        catch (PatientException exception)
        {
            return Problem(title: exception.Message, statusCode: exception.StatusCode);
        }
    }

    [HttpPost("appointments/{appointmentId:guid}/cancel")]
    [ProducesResponseType(typeof(AppointmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CancelAppointment(Guid appointmentId, CancellationToken cancellationToken = default)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Problem(title: "Authenticated user subject is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            var appointment = await _booking.CancelAppointmentAsync(appointmentId, user.Id, cancellationToken);
            return Ok(appointment);
        }
        catch (BookingException exception)
        {
            return Problem(title: exception.Message, statusCode: exception.StatusCode);
        }
    }

    [HttpPost("appointments/{appointmentId:guid}/reschedule")]
    [ProducesResponseType(typeof(AppointmentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RescheduleAppointment(
        Guid appointmentId,
        ReschedulePatientAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Problem(title: "Authenticated user subject is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            var appointment = await _booking.RescheduleAppointmentAsync(appointmentId, user.Id, request.SlotId, cancellationToken);
            return Ok(appointment);
        }
        catch (BookingException exception)
        {
            return Problem(title: exception.Message, statusCode: exception.StatusCode);
        }
    }

    private async Task<User?> EnsureCurrentUserAsync(CancellationToken cancellationToken = default)
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
}
