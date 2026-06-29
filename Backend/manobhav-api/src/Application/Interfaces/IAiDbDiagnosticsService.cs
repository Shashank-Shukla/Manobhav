using Application.DTOs;

namespace Application.Interfaces;

/// <summary>
/// Read-only diagnostics over every operational table, for an AI agent to inspect production data.
/// Data is returned fully RAW/unredacted (alpha-stage decision) — nothing is masked or suppressed. The
/// endpoint is intentionally ungated at the WebApi boundary.
/// </summary>
public interface IAiDbDiagnosticsService
{
    /// <summary>The table keys this endpoint will serve (path segment values).</summary>
    IReadOnlyList<string> Tables { get; }

    Task<IReadOnlyList<AiDbDiagnosticsTableSummaryDto>> GetSummaryAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns a page of rows (column→value maps) for a known table, or null for an unknown table.</summary>
    Task<object?> GetTableAsync(string table, int limit, int offset, CancellationToken cancellationToken = default);
}
