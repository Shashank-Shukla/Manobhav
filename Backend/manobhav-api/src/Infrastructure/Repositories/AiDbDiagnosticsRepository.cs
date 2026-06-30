using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Application.DTOs;
using Application.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Infrastructure.Repositories;

/// <summary>
/// Generic, reflection-driven reader over every EF entity type. Returns every scalar column value
/// fully RAW and unredacted — including PII, IPs, ciphertext and live auth secrets (OTP hashes,
/// Cognito session/lock tokens) — because the endpoint is intentionally ungated in alpha and the owner
/// wants the complete picture to verify data correctness. NOTHING is masked or suppressed; this MUST
/// be re-gated and re-redacted before real users onboard.
/// </summary>
public sealed class AiDbDiagnosticsRepository : IAiDbDiagnosticsRepository
{
    private static readonly MethodInfo ReadRowsMethod = typeof(AiDbDiagnosticsRepository)
        .GetMethod(nameof(ReadRowsGenericAsync), BindingFlags.Instance | BindingFlags.NonPublic)!;

    private static readonly MethodInfo CountMethod = typeof(AiDbDiagnosticsRepository)
        .GetMethod(nameof(CountGenericAsync), BindingFlags.Instance | BindingFlags.NonPublic)!;

    private static readonly JsonSerializerOptions WriteValueJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        Converters = { new JsonStringEnumConverter() },
    };

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

    public async Task<AiDbDiagnosticsWriteResult> UpdateRowAsync(
        string table,
        string id,
        IReadOnlyDictionary<string, JsonElement> values,
        CancellationToken cancellationToken = default)
    {
        if (!TryResolveRow(table, id, out var entityType, out var keyValue, out var failure))
        {
            return failure;
        }

        var entity = await _db.FindAsync(entityType.ClrType, [keyValue], cancellationToken);
        if (entity is null)
        {
            return new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.NotFound);
        }

        var columns = entityType.GetProperties()
            .Where(property => property.PropertyInfo is not null && !property.IsPrimaryKey())
            .ToDictionary(property => property.Name, property => property, StringComparer.OrdinalIgnoreCase);

        var applied = 0;
        foreach (var (name, element) in values)
        {
            if (!columns.TryGetValue(name, out var property))
            {
                continue;
            }

            if (!TryConvertJsonValue(element, property.ClrType, out var value, out var error))
            {
                return new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.BadRequest, $"Column '{property.Name}': {error}");
            }

            property.PropertyInfo!.SetValue(entity, value);
            applied++;
        }

        if (applied == 0)
        {
            return new AiDbDiagnosticsWriteResult(
                AiDbDiagnosticsWriteStatus.BadRequest,
                "No updatable (non-key) columns in the request body matched this table.");
        }

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            return new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.Conflict, DescribeDbError(exception));
        }

        return new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.Success, Row: ReadRow(entityType, entity));
    }

    public async Task<AiDbDiagnosticsWriteResult> DeleteRowAsync(string table, string id, CancellationToken cancellationToken = default)
    {
        if (!TryResolveRow(table, id, out var entityType, out var keyValue, out var failure))
        {
            return failure;
        }

        var entity = await _db.FindAsync(entityType.ClrType, [keyValue], cancellationToken);
        if (entity is null)
        {
            return new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.NotFound);
        }

        _db.Remove(entity);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            return new AiDbDiagnosticsWriteResult(
                AiDbDiagnosticsWriteStatus.Conflict,
                "Delete was blocked, most likely by a foreign-key constraint — remove dependent rows first. " + DescribeDbError(exception));
        }

        return new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.Success);
    }

    private bool TryResolveRow(string table, string id, out IEntityType entityType, out object keyValue, out AiDbDiagnosticsWriteResult failure)
    {
        entityType = null!;
        keyValue = null!;
        failure = null!;

        if (string.IsNullOrWhiteSpace(table) || !_tables.TryGetValue(table.Trim(), out var resolved))
        {
            failure = new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.UnknownTable);
            return false;
        }

        entityType = resolved;
        var keyProperty = resolved.FindPrimaryKey()?.Properties.FirstOrDefault(property => property.PropertyInfo is not null);
        if (keyProperty?.PropertyInfo is null)
        {
            failure = new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.BadRequest, "Table has no single-column primary key to address rows by.");
            return false;
        }

        if (!TryConvertId(id, keyProperty.ClrType, out var converted) || converted is null)
        {
            failure = new AiDbDiagnosticsWriteResult(AiDbDiagnosticsWriteStatus.BadRequest, $"'{id}' is not a valid {keyProperty.ClrType.Name} primary key.");
            return false;
        }

        keyValue = converted;
        return true;
    }

    private static IReadOnlyDictionary<string, object?> ReadRow(IEntityType entityType, object entity)
    {
        return entityType.GetProperties()
            .Where(property => property.PropertyInfo is not null)
            .ToDictionary(property => property.Name, property => property.PropertyInfo!.GetValue(entity), StringComparer.Ordinal);
    }

    private static bool TryConvertId(string id, Type keyType, out object? key)
    {
        key = null;
        if (string.IsNullOrWhiteSpace(id))
        {
            return false;
        }

        var target = Nullable.GetUnderlyingType(keyType) ?? keyType;
        try
        {
            if (target == typeof(Guid))
            {
                key = Guid.Parse(id);
            }
            else if (target == typeof(string))
            {
                key = id;
            }
            else if (target.IsEnum)
            {
                key = Enum.Parse(target, id, ignoreCase: true);
            }
            else
            {
                key = Convert.ChangeType(id, target, CultureInfo.InvariantCulture);
            }

            return true;
        }
        catch
        {
            key = null;
            return false;
        }
    }

    private static bool TryConvertJsonValue(JsonElement element, Type targetType, out object? value, out string? error)
    {
        value = null;
        error = null;
        var underlying = Nullable.GetUnderlyingType(targetType) ?? targetType;
        var allowsNull = Nullable.GetUnderlyingType(targetType) is not null || !targetType.IsValueType;

        if (element.ValueKind == JsonValueKind.Null)
        {
            if (!allowsNull)
            {
                error = $"cannot set a non-nullable {underlying.Name} column to null.";
                return false;
            }

            value = null;
            return true;
        }

        try
        {
            value = JsonSerializer.Deserialize(element.GetRawText(), targetType, WriteValueJsonOptions);
            return true;
        }
        catch (Exception exception) when (exception is JsonException or NotSupportedException or FormatException)
        {
            error = $"expected a {underlying.Name} value ({exception.Message}).";
            return false;
        }
    }

    private static string DescribeDbError(DbUpdateException exception)
    {
        return (exception.InnerException ?? exception).Message;
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
                property => property.PropertyInfo!.GetValue(entity),
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
