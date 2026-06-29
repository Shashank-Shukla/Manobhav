using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApi.Security;

namespace WebApi.Controllers;

/// <summary>
/// Read-only, PII-redacted diagnostics over a curated subset of operational tables, for an AI agent
/// to inspect production data when the private database isn't otherwise reachable. Disabled by
/// default and gated by <see cref="AiDbDiagnosticsKeyAuthorizationFilter"/> (SSM-configured key); highly
/// sensitive tables (OTP, payout, raw intake answers, audit, visitor IPs) are never exposed.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/ai-db-diagnostics")]
[ServiceFilter(typeof(AiDbDiagnosticsKeyAuthorizationFilter))]
public sealed class AiDbDiagnosticsController : ControllerBase
{
    private readonly IAiDbDiagnosticsService _diagnostics;

    public AiDbDiagnosticsController(IAiDbDiagnosticsService diagnostics)
    {
        _diagnostics = diagnostics;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AiDbDiagnosticsTableSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AiDbDiagnosticsTableSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        return Ok(await _diagnostics.GetSummaryAsync(cancellationToken));
    }

    [HttpGet("{table}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTable(
        string table,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var rows = await _diagnostics.GetTableAsync(table, limit, offset, cancellationToken);
        return rows is null ? NotFound() : Ok(rows);
    }
}
