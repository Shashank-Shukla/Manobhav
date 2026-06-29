using Application.DTOs;
using Application.Interfaces;

namespace Application.Services;

/// <summary>
/// Surfaces raw, paged table data for the (intentionally ungated) AI diagnostics endpoint. Table set,
/// row shaping and secret suppression all live in <see cref="IAiDbDiagnosticsRepository"/>; this
/// service only clamps paging and assembles the summary.
/// </summary>
public sealed class AiDbDiagnosticsService : IAiDbDiagnosticsService
{
    private const int MaxLimit = 500;
    private const int DefaultLimit = 50;

    private readonly IAiDbDiagnosticsRepository _repository;

    public AiDbDiagnosticsService(IAiDbDiagnosticsRepository repository)
    {
        _repository = repository;
    }

    public IReadOnlyList<string> Tables => _repository.TableKeys;

    public async Task<IReadOnlyList<AiDbDiagnosticsTableSummaryDto>> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var counts = await _repository.GetTableCountsAsync(cancellationToken);
        return _repository.TableKeys
            .Select(table => new AiDbDiagnosticsTableSummaryDto(table, counts.TryGetValue(table, out var count) ? count : 0))
            .ToList();
    }

    public async Task<object?> GetTableAsync(string table, int limit, int offset, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(table))
        {
            return null;
        }

        var safeLimit = Math.Clamp(limit <= 0 ? DefaultLimit : limit, 1, MaxLimit);
        var safeOffset = Math.Max(0, offset);

        return await _repository.GetRowsAsync(table.Trim(), safeLimit, safeOffset, cancellationToken);
    }
}
