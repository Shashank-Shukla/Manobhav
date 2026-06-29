using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

/// <summary>
/// Read-only, PII-redacted diagnostics over a curated subset of operational tables, for an AI agent
/// to inspect production data when the private database isn't otherwise reachable. Highly sensitive
/// tables (OTP, payout, raw intake answers, audit, visitor IPs) are never exposed, and fields such as
/// email/phone are masked.
/// </summary>
/// <remarks>
/// ⚠ SECURITY — this endpoint is intentionally UNGATED (publicly reachable, no key and no auth) while
/// the product is in alpha with no real users (owner decision, 2026-06-29). It still returns redacted
/// rows from appointments, user-roles and provider-applications, so it MUST be re-gated or further
/// redacted before real users onboard. Re-gating recipe (tracked in docs/WORK_TRACKER.md): restore
/// AiDbDiagnosticsOptions + AiDbDiagnosticsKeyAuthorizationFilter (see git history of PR #28), re-add
/// [ServiceFilter(typeof(AiDbDiagnosticsKeyAuthorizationFilter))] to this controller, and re-bind the
/// "AiDbDiagnostics" config section + filter registration in Program.cs.
/// </remarks>
[ApiController]
[AllowAnonymous]
[Route("api/ai-db-diagnostics")]
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
