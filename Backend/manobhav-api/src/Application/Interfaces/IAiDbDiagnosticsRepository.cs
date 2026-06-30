using System.Text.Json;
using Application.DTOs;

namespace Application.Interfaces;

/// <summary>
/// Read-only, paged access to every mapped table for the AI diagnostics endpoint. Rows are returned
/// as ordered column→value maps, fully raw and unredacted (including PII and live auth secrets), so the
/// agent can verify data correctness. Nothing is masked or suppressed — this must be re-gated and
/// re-redacted before real users onboard.
/// </summary>
public interface IAiDbDiagnosticsRepository
{
    /// <summary>Kebab-case keys for every table the endpoint can serve (one per EF entity type).</summary>
    IReadOnlyList<string> TableKeys { get; }

    /// <summary>Row counts keyed by table key.</summary>
    Task<IReadOnlyDictionary<string, int>> GetTableCountsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns a page of rows for <paramref name="table"/> (each row an ordered column→value map), or
    /// <c>null</c> when the table key is unknown.
    /// </summary>
    Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>?> GetRowsAsync(
        string table,
        int limit,
        int offset,
        CancellationToken cancellationToken = default);

    /// <summary>Updates the supplied (non-key) columns of a single row, addressed by table key + primary-key value.</summary>
    Task<AiDbDiagnosticsWriteResult> UpdateRowAsync(
        string table,
        string id,
        IReadOnlyDictionary<string, JsonElement> values,
        CancellationToken cancellationToken = default);

    /// <summary>Deletes a single row by table key + primary-key value (EF cascades remove dependent rows where configured).</summary>
    Task<AiDbDiagnosticsWriteResult> DeleteRowAsync(string table, string id, CancellationToken cancellationToken = default);
}
