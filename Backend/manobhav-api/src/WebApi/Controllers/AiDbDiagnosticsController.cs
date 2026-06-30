using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

/// <summary>
/// Read-only diagnostics over EVERY operational table, for an AI agent to inspect production data when
/// the private database isn't otherwise reachable. Rows are returned RAW and FULLY UNREDACTED (owner
/// decision, alpha stage) so data correctness can be verified — full emails/phones, IPs, JSON blobs,
/// ciphertext and even live auth secrets (OTP hashes, Cognito session/lock tokens) are all surfaced.
/// Nothing is masked or suppressed.
/// </summary>
/// <remarks>
/// ⚠ SECURITY — this endpoint is intentionally UNGATED (publicly reachable, no key and no auth) AND
/// fully unredacted (incl. live credentials) while the product is in alpha with no real users (owner
/// decision, 2026-06-29). It exposes raw rows from every table AND allows WRITES — PUT updates a row's
/// columns and DELETE removes a row (EF cascades dependent rows where configured) — so it is destructive
/// and MUST be re-gated AND re-redacted before real users onboard.
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

    /// <summary>Updates a single row's (non-key) columns. Body is a JSON object of column→value, e.g. {"Summary":"...","IsFeatured":true}.</summary>
    [HttpPut("{table}/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateRow(
        string table,
        string id,
        [FromBody] Dictionary<string, JsonElement>? values,
        CancellationToken cancellationToken = default)
    {
        var result = await _diagnostics.UpdateRowAsync(table, id, values ?? new Dictionary<string, JsonElement>(), cancellationToken);
        return MapWriteResult(result);
    }

    /// <summary>Deletes a single row by primary key (cascades to dependent rows where the schema allows).</summary>
    [HttpDelete("{table}/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteRow(string table, string id, CancellationToken cancellationToken = default)
    {
        var result = await _diagnostics.DeleteRowAsync(table, id, cancellationToken);
        return MapWriteResult(result);
    }

    private IActionResult MapWriteResult(AiDbDiagnosticsWriteResult result)
    {
        return result.Status switch
        {
            AiDbDiagnosticsWriteStatus.UnknownTable or AiDbDiagnosticsWriteStatus.NotFound => NotFound(),
            AiDbDiagnosticsWriteStatus.BadRequest => BadRequest(new { error = result.Message }),
            AiDbDiagnosticsWriteStatus.Conflict => Conflict(new { error = result.Message }),
            AiDbDiagnosticsWriteStatus.Success => Ok(result.Row ?? (object)new { status = "ok" }),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
