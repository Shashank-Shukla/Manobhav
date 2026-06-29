namespace Application.DTOs;

/// <summary>
/// The AI diagnostics endpoint returns table rows as raw, unredacted column→value maps
/// (<c>IReadOnlyDictionary&lt;string, object?&gt;</c>), so no per-table projection DTOs exist. Only the
/// summary row count is a typed DTO. A small denylist of live auth-secret columns is suppressed in the
/// repository; everything else (PII, IPs, JSON blobs, ciphertext) is surfaced as stored.
/// </summary>
public sealed record AiDbDiagnosticsTableSummaryDto(string Table, int Count);
