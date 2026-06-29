using Application.DTOs;

namespace Application.Interfaces;

/// <summary>
/// Read-only diagnostics over a curated, PII-redacted subset of operational tables, for an AI agent
/// to inspect production data. Gating (key/enabled) is enforced at the WebApi boundary.
/// </summary>
public interface IDiagnosticsService
{
    /// <summary>The table keys this endpoint will serve (path segment values).</summary>
    IReadOnlyList<string> Tables { get; }

    Task<IReadOnlyList<DiagnosticsTableSummaryDto>> GetSummaryAsync(CancellationToken cancellationToken);

    /// <summary>Returns a typed, redacted list for a known table (boxed for serialization), or null for an unknown table.</summary>
    Task<object?> GetTableAsync(string table, int limit, int offset, CancellationToken cancellationToken);
}
