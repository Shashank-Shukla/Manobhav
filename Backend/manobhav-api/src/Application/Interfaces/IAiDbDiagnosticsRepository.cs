namespace Application.Interfaces;

/// <summary>
/// Read-only, paged access to every mapped table for the AI diagnostics endpoint. Rows are returned
/// as ordered column→value maps (raw, unredacted) so the agent can verify data correctness. A small
/// denylist of live auth-secret columns (OTP hashes, Cognito session tokens) is suppressed at this
/// layer — see the implementation — because those are replayable secrets, not data to verify.
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
}
