using Application.DTOs;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

[ApiController]
[Route("api/visitors")]
public sealed class VisitorsController : ControllerBase
{
    private readonly IVisitorAnalyticsService _visitorAnalytics;

    public VisitorsController(IVisitorAnalyticsService visitorAnalytics)
    {
        _visitorAnalytics = visitorAnalytics;
    }

    [AllowAnonymous]
    [HttpPost]
    [ProducesResponseType(typeof(CreateVisitorResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(CreateVisitorRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _visitorAnalytics.CreateVisitorAsync(request, CreateTelemetry(), cancellationToken);
            return Created($"/api/visitors/{response.VisitorId}", response);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [AllowAnonymous]
    [HttpPost("{visitorId:guid}/events")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordEvent(Guid visitorId, VisitorEventRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await _visitorAnalytics.RecordEventAsync(visitorId, request, cancellationToken);
            return Accepted();
        }
        catch (VisitorAnalyticsValidationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [Authorize]
    [HttpPost("{visitorId:guid}/conversion")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LinkToAuthenticatedUser(Guid visitorId, CancellationToken cancellationToken)
    {
        var userSubject = User.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(userSubject))
        {
            return Problem(title: "Authenticated user subject is missing.", statusCode: StatusCodes.Status400BadRequest);
        }

        try
        {
            await _visitorAnalytics.LinkVisitorToUserAsync(visitorId, userSubject, cancellationToken);
            return NoContent();
        }
        catch (VisitorAnalyticsValidationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    private ServerVisitorTelemetry CreateTelemetry()
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();
        var referrer = Request.Headers.Referer.ToString();
        return new ServerVisitorTelemetry(ip, userAgent, referrer);
    }
}
