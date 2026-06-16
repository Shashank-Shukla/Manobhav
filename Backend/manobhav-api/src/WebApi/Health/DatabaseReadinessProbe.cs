using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Health;

public interface IDatabaseReadinessProbe
{
    Task<DatabaseReadinessResult> CheckAsync(CancellationToken cancellationToken);
}

public sealed record DatabaseReadinessResult(bool IsReady, string? FailureTitle)
{
    public static DatabaseReadinessResult Ready() => new(IsReady: true, FailureTitle: null);

    public static DatabaseReadinessResult NotReady(string failureTitle) => new(IsReady: false, FailureTitle: failureTitle);
}

public sealed class EfCoreDatabaseReadinessProbe : IDatabaseReadinessProbe
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<EfCoreDatabaseReadinessProbe> _logger;

    public EfCoreDatabaseReadinessProbe(ApplicationDbContext db, ILogger<EfCoreDatabaseReadinessProbe> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<DatabaseReadinessResult> CheckAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (!await _db.Database.CanConnectAsync(cancellationToken))
            {
                return DatabaseReadinessResult.NotReady("Database is not reachable.");
            }

            return _db.Database.IsRelational()
                ? await CheckMigrationsAsync(cancellationToken)
                : DatabaseReadinessResult.Ready();
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "Database readiness check failed.");
            return DatabaseReadinessResult.NotReady("Database schema readiness check failed.");
        }
    }

    private async Task<DatabaseReadinessResult> CheckMigrationsAsync(CancellationToken cancellationToken)
    {
        var pendingMigrations = await _db.Database.GetPendingMigrationsAsync(cancellationToken);
        if (!pendingMigrations.Any())
        {
            return DatabaseReadinessResult.Ready();
        }

        _logger.LogWarning("Database readiness failed because EF Core migrations are pending.");
        return DatabaseReadinessResult.NotReady("Database migrations are pending.");
    }
}
