using Application.DTOs;
using Application.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/intake")]
public sealed class IntakeController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IntakeWorkflowService _intake;

    public IntakeController(ApplicationDbContext db, IntakeWorkflowService intake)
    {
        _db = db;
        _intake = intake;
    }

    [AllowAnonymous]
    [HttpGet("/api/public/intake-forms/active")]
    [ProducesResponseType(typeof(IntakeFormDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetActiveForm([FromQuery] string kind = "PatientIntake", CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _intake.GetActiveFormAsync(kind, cancellationToken));
        }
        catch (IntakeValidationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [AllowAnonymous]
    [HttpPost("submissions")]
    [ProducesResponseType(typeof(IntakeSubmissionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSubmission(CreateIntakeSubmissionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _intake.CreateSubmissionAsync(ResolveCreateSubmissionRequest(request), cancellationToken);
            return Created($"/api/intake/submissions/{response.Id}", response);
        }
        catch (IntakeValidationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [AllowAnonymous]
    [HttpPut("submissions/{submissionId:guid}/answers/{questionKey}")]
    [ProducesResponseType(typeof(IntakeSubmissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveAnswer(
        Guid submissionId,
        string questionKey,
        SaveIntakeAnswerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var owner = await ReadOwnerContextAsync(cancellationToken);
            return Ok(await _intake.SaveAnswerAsync(submissionId, questionKey, request, owner, cancellationToken));
        }
        catch (IntakeValidationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [AllowAnonymous]
    [HttpPost("submissions/{submissionId:guid}/submit-partial")]
    [ProducesResponseType(typeof(IntakeSubmissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitPartial(Guid submissionId, SubmitPartialIntakeRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var owner = await ReadOwnerContextAsync(cancellationToken);
            return Ok(await _intake.SubmitPartialAsync(submissionId, request, owner, cancellationToken));
        }
        catch (IntakeValidationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [AllowAnonymous]
    [HttpPost("submissions/{submissionId:guid}/consent")]
    [ProducesResponseType(typeof(IntakeSubmissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SignConsent(Guid submissionId, SignConsentRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var owner = await ReadOwnerContextAsync(cancellationToken);
            return Ok(await _intake.SignConsentAsync(
                submissionId,
                owner,
                request,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString(),
                cancellationToken));
        }
        catch (IntakeValidationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [Authorize]
    [HttpPost("submissions/{submissionId:guid}/complete-profile")]
    [ProducesResponseType(typeof(IntakeSubmissionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CompleteProfile(Guid submissionId, CompleteProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await EnsureCurrentUserAsync(cancellationToken);
        if (user is null)
        {
            return Problem(title: "Authenticated user subject is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            return Ok(await _intake.CompleteProfileAsync(submissionId, user.Id, TryReadVisitorCookie(), request, cancellationToken));
        }
        catch (IntakeValidationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    private Guid? TryReadVisitorCookie()
    {
        return Request.Cookies.TryGetValue("mbv_vid", out var value) && Guid.TryParse(value, out var visitorId)
            ? visitorId
            : null;
    }

    private CreateIntakeSubmissionRequest ResolveCreateSubmissionRequest(CreateIntakeSubmissionRequest request)
    {
        return IsPatientIntake(request.SubmissionKind)
            ? request with { VisitorSessionId = TryReadVisitorCookie() }
            : request;
    }

    private static bool IsPatientIntake(string submissionKind)
    {
        return string.Equals(submissionKind, "PatientIntake", StringComparison.Ordinal);
    }

    private async Task<IntakeOwnerContext> ReadOwnerContextAsync(CancellationToken cancellationToken)
    {
        var user = User.Identity?.IsAuthenticated == true
            ? await EnsureCurrentUserAsync(cancellationToken)
            : null;
        return new IntakeOwnerContext(user?.Id, TryReadVisitorCookie());
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
}
