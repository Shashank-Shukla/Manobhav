using Application.DTOs;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

[ApiController]
[Route("api/visitors")]
public sealed class VisitorsController : ControllerBase
{
    private const string VisitorCookieName = "mbv_vid";
    private readonly IVisitorAnalyticsService _visitorAnalytics;
    private readonly IWebHostEnvironment _environment;
    private readonly VisitorAnalyticsOptions _analyticsOptions;

    public VisitorsController(
        IVisitorAnalyticsService visitorAnalytics,
        IWebHostEnvironment environment,
        VisitorAnalyticsOptions analyticsOptions)
    {
        _visitorAnalytics = visitorAnalytics;
        _environment = environment;
        _analyticsOptions = analyticsOptions;
    }

    [AllowAnonymous]
    [HttpPost("session")]
    [ProducesResponseType(typeof(CreateVisitorResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSession(CreateVisitorRequest request, CancellationToken cancellationToken)
    {
        try
        {
            if (Request.Cookies.TryGetValue(VisitorCookieName, out var existingValue) &&
                Guid.TryParse(existingValue, out var existingVisitorId))
            {
                return Ok(new CreateVisitorResponse(
                    existingVisitorId,
                    _analyticsOptions.FullCaptureEnabled,
                    _analyticsOptions.RetentionDays));
            }

            var response = await _visitorAnalytics.CreateVisitorAsync(request, CreateTelemetry(), cancellationToken);
            SetVisitorCookie(response.VisitorId);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
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
            SetVisitorCookie(response.VisitorId);
            return Created($"/api/visitors/{response.VisitorId}", response);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(title: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [AllowAnonymous]
    [HttpPost("events")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordEventFromSession(VisitorEventRequest request, CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue(VisitorCookieName, out var value) || !Guid.TryParse(value, out var visitorId))
        {
            return Problem(title: "Visitor session cookie is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        return await RecordEventForVisitorAsync(visitorId, request, cancellationToken);
    }

    // Private helper only. The visitor id is taken from the HttpOnly mbv_vid cookie,
    // never from a caller-supplied route value, so events cannot be spoofed onto an
    // arbitrary visitor session.
    private async Task<IActionResult> RecordEventForVisitorAsync(Guid visitorId, VisitorEventRequest request, CancellationToken cancellationToken)
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
    [HttpPost("session/conversion")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LinkSessionToAuthenticatedUser(CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue(VisitorCookieName, out var value) || !Guid.TryParse(value, out var visitorId))
        {
            return Problem(title: "Visitor session cookie is required.", statusCode: StatusCodes.Status400BadRequest);
        }

        return await LinkVisitor(visitorId, cancellationToken);
    }

    private async Task<IActionResult> LinkVisitor(Guid visitorId, CancellationToken cancellationToken)
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

    private void SetVisitorCookie(Guid visitorId)
    {
        Response.Cookies.Append(
            VisitorCookieName,
            visitorId.ToString(),
            new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Domain = _environment.IsDevelopment() ? null : ".manobhav.co.in",
                Expires = DateTimeOffset.UtcNow.AddDays(365)
            });
    }
}
