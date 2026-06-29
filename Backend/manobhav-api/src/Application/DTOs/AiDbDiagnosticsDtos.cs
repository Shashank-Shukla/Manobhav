namespace Application.DTOs;

/// <summary>
/// The AI diagnostics endpoint returns table rows as raw, unredacted column→value maps
/// (<c>IReadOnlyDictionary&lt;string, object?&gt;</c>), so no per-table projection DTOs exist. Only the
/// summary row count is a typed DTO. Every column is surfaced exactly as stored (PII, IPs, JSON blobs,
/// ciphertext and live auth secrets); nothing is masked or suppressed.
/// </summary>
public sealed record AiDbDiagnosticsTableSummaryDto(string Table, int Count);
