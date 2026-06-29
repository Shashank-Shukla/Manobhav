using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using Application.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Infrastructure.Repositories;

/// <summary>
/// Generic, reflection-driven reader over every EF entity type. Returns raw scalar column values so
/// the diagnostics endpoint can surface ALL data unredacted (the endpoint is intentionally ungated in
/// alpha). The ONLY values held back are live auth secrets in <see cref="SuppressedColumns"/> — OTP
/// hashes and Cognito session/lock tokens — which are replayable credentials, not data to verify;
/// their column still appears, with a placeholder value, so the shape stays visible.
/// </summary>
public sealed class AiDbDiagnosticsRepository : IAiDbDiagnosticsRepository
{
    private const string SuppressedPlaceholder = "[suppressed: live auth secret]";

    private static readonly HashSet<string> SuppressedColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "OtpHash",
        "OtpSalt",
        "ProviderSession",
        "VerificationLockToken",
    };

    private static readonly MethodInfo ReadRowsMethod = typeof(AiDbDiagnosticsRepository)
        .GetMethod(nameof(ReadRowsGenericAsync), BindingFlags.Instance | BindingFlags.NonPublic)!;

    private static readonly MethodInfo CountMethod = typeof(AiDbDiagnosticsRepository)
        .GetMethod(nameof(CountGenericAsync), BindingFlags.Instance | BindingFlags.NonPublic)!;

    private readonly ApplicationDbContext _db;
    private readonly IReadOnlyDictionary<string, IEntityType> _tables;

    public AiDbDiagnosticsRepository(ApplicationDbContext db)
    {
        _db = db;
        _tables = db.Model.GetEntityTypes()
            .Where(type => !type.IsOwned() && type.ClrType != typeof(object) && type.FindPrimaryKey() is not null)
            .GroupBy(type => ToTableKey(type.ClrType.Name), StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
    }

    public IReadOnlyList<string> TableKeys =>
        _tables.Keys.OrderBy(key => key, StringComparer.Ordinal).ToList();

    public async Task<IReadOnlyDictionary<string, int>> GetTableCountsAsync(CancellationToken cancellationToken = default)
    {
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var (key, entityType) in _tables)
        {
            var task = (Task<int>)CountMethod
                .MakeGenericMethod(entityType.ClrType)
                .Invoke(this, [cancellationToken])!;
            counts[key] = await task;
        }

        return counts;
    }

    public async Task<IReadOnlyList<IReadOnlyDictionary<string, object?>>?> GetRowsAsync(
        string table,
        int limit,
        int offset,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(table) || !_tables.TryGetValue(table, out var entityType))
        {
            return null;
        }

        var task = (Task<List<IReadOnlyDictionary<string, object?>>>)ReadRowsMethod
            .MakeGenericMethod(entityType.ClrType)
            .Invoke(this, [entityType, limit, offset, cancellationToken])!;
        return await task;
    }

    private async Task<int> CountGenericAsync<T>(CancellationToken cancellationToken) where T : class
    {
        return await _db.Set<T>().CountAsync(cancellationToken);
    }

    private async Task<List<IReadOnlyDictionary<string, object?>>> ReadRowsGenericAsync<T>(
        IEntityType entityType,
        int limit,
        int offset,
        CancellationToken cancellationToken) where T : class
    {
        var properties = entityType.GetProperties()
            .Where(property => property.PropertyInfo is not null)
            .ToList();

        var entities = await ApplyKeyOrder(_db.Set<T>().AsNoTracking(), entityType)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return entities
            .Select(entity => (IReadOnlyDictionary<string, object?>)properties.ToDictionary(
                property => property.Name,
                property => SuppressedColumns.Contains(property.Name)
                    ? SuppressedPlaceholder
                    : property.PropertyInfo!.GetValue(entity),
                StringComparer.Ordinal))
            .ToList();
    }

    private static IQueryable<T> ApplyKeyOrder<T>(IQueryable<T> query, IEntityType entityType) where T : class
    {
        var key = entityType.FindPrimaryKey()?.Properties.FirstOrDefault(property => property.PropertyInfo is not null);
        if (key?.PropertyInfo is null)
        {
            return query;
        }

        // query.OrderBy(e => e.<PrimaryKey>) built dynamically so pagination is deterministic for any key type.
        var parameter = Expression.Parameter(typeof(T), "entity");
        var keyAccess = Expression.Property(parameter, key.PropertyInfo);
        var selector = Expression.Lambda(keyAccess, parameter);
        var ordered = Expression.Call(
            typeof(Queryable),
            nameof(Queryable.OrderBy),
            [typeof(T), key.PropertyInfo.PropertyType],
            query.Expression,
            Expression.Quote(selector));

        return query.Provider.CreateQuery<T>(ordered);
    }

    private static string ToTableKey(string typeName)
    {
        var builder = new StringBuilder(typeName.Length + 8);
        for (var index = 0; index < typeName.Length; index++)
        {
            var character = typeName[index];
            if (char.IsUpper(character) && index > 0)
            {
                builder.Append('-');
            }

            builder.Append(char.ToLowerInvariant(character));
        }

        return builder.ToString();
    }
}
