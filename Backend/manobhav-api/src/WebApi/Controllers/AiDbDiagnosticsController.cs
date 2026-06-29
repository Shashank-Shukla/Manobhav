using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

/// <summary>
/// Read-only diagnostics over EVERY operational table, for an AI agent to inspect production data when
/// the private database isn't otherwise reachable. Rows are returned RAW and UNREDACTED (owner decision,
/// alpha stage) so data correctness can be verified — full emails/phones, IPs, JSON blobs and ciphertext
/// are all surfaced. The single exception is a denylist of live auth secrets (OTP hashes, Cognito
/// session/lock tokens) which are suppressed in the repository because they are replayable credentials.
/// </summary>
/// <remarks>
/// ⚠ SECURITY — this endpoint is intentionally UNGATED (publicly reachable, no key and no auth) AND
/// unredacted while the product is in alpha with no real users (owner decision, 2026-06-29). It exposes
/// raw rows from every table, so it MUST be re-gated AND re-redacted before real users onboard.
/// Re-gating recipe (tracked in docs/WORK_TRACKER.md): restore AiDbDiagnosticsOptions +
/// AiDbDiagnosticsKeyAuthorizationFilter (see git history of PR #28), re-add
/// [ServiceFilter(typeof(AiDbDiagnosticsKeyAuthorizationFilter))] to this controller, re-bind the
/// "AiDbDiagnostics" config section + filter registration in Program.cs, and reinstate column masking.
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
    public async Task<ActionResult<IReadOnlyList<AiDbDiagnosticsTableSummaryDto>>> GetSummary(CancellationToken cancellationToken = default)
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
