namespace Application.DTOs;

/// <summary>
/// The AI diagnostics endpoint returns table rows as raw, unredacted column→value maps
/// (<c>IReadOnlyDictionary&lt;string, object?&gt;</c>), so no per-table projection DTOs exist. Only the
/// summary row count is a typed DTO. Every column is surfaced exactly as stored (PII, IPs, JSON blobs,
/// ciphertext and live auth secrets); nothing is masked or suppressed.
/// </summary>
public sealed record AiDbDiagnosticsTableSummaryDto(string Table, int Count);

/// <summary>Outcome of a diagnostics write (PUT/DELETE) so the controller can map it to an HTTP status.</summary>
public enum AiDbDiagnosticsWriteStatus
{
    UnknownTable,
    NotFound,
    BadRequest,
    Conflict,
    Success,
}

/// <summary>Result of a diagnostics row update/delete; <see cref="Row"/> holds the updated row on a successful PUT.</summary>
public sealed record AiDbDiagnosticsWriteResult(
    AiDbDiagnosticsWriteStatus Status,
    string? Message = null,
    IReadOnlyDictionary<string, object?>? Row = null);
