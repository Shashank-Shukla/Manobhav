using System.Text.Json;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/notifications")]
public sealed class AdminNotificationsController : ControllerBase
{
    private const string ProviderApplicationSubmittedType = "ProviderApplicationSubmitted";
    private readonly ApplicationDbContext _db;

    public AdminNotificationsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminNotificationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminNotificationDto>>> List(CancellationToken cancellationToken = default)
    {
        var storedNotifications = await _db.AdminNotifications
            .AsNoTracking()
            .Where(notification => notification.ReadAtUtc == null)
            .OrderByDescending(notification => notification.CreatedAtUtc)
            .Take(50)
            .Select(notification => ToDto(notification))
            .ToListAsync(cancellationToken);

        var derivedNotifications = await ReadSubmittedApplicationNotificationsAsync(cancellationToken);
        var readKeys = await ReadProviderApplicationReadKeysAsync(
            derivedNotifications.Select(notification => notification.Id).ToList(),
            cancellationToken);

        return Ok(storedNotifications
            .Concat(derivedNotifications.Where(notification => !readKeys.Contains(notification.Id)))
            .OrderByDescending(notification => notification.CreatedAtUtc)
            .Take(50)
            .ToList());
    }

    [HttpPost("{notificationId}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead(string notificationId, CancellationToken cancellationToken = default)
    {
        var notification = await _db.AdminNotifications
            .FirstOrDefaultAsync(item => item.NotificationKey == notificationId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var createdNotification = notification is null;
        if (notification is null)
        {
            notification = new AdminNotification
            {
                NotificationKey = notificationId,
                Type = ResolveType(notificationId),
                Title = "Read notification",
                Body = string.Empty,
                LinkPath = string.Empty,
                CreatedAtUtc = now,
                ReadAtUtc = now
            };
            await _db.AdminNotifications.AddAsync(notification, cancellationToken);
        }
        else if (notification.ReadAtUtc is null)
        {
            notification.ReadAtUtc = now;
        }

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (createdNotification)
        {
            if (!await NotificationKeyExistsAsync(notificationId, cancellationToken))
            {
                throw;
            }

            DetachPendingAdminNotification(notificationId);
        }

        return NoContent();
    }

    private async Task<IReadOnlyList<AdminNotificationDto>> ReadSubmittedApplicationNotificationsAsync(CancellationToken cancellationToken = default)
    {
        var applications = await _db.ProviderOnboardingApplications
            .AsNoTracking()
            .Where(application => application.Status == "Submitted")
            .OrderByDescending(application => application.SubmittedAtUtc ?? application.UpdatedAtUtc ?? application.CreatedAtUtc)
            .Take(50)
            .Select(application => new
            {
                application.Id,
                application.BasicProfileJson,
                application.CreatedAtUtc,
                application.UpdatedAtUtc,
                application.SubmittedAtUtc
            })
            .ToListAsync(cancellationToken);

        return applications
            .Select(application => ToProviderApplicationNotification(
                application.Id,
                application.BasicProfileJson,
                application.SubmittedAtUtc ?? application.UpdatedAtUtc ?? application.CreatedAtUtc))
            .ToList();
    }

    private async Task<ISet<string>> ReadProviderApplicationReadKeysAsync(
        IReadOnlyCollection<string> candidateNotificationKeys,
        CancellationToken cancellationToken = default)
    {
        if (candidateNotificationKeys.Count == 0)
        {
            return new HashSet<string>(StringComparer.Ordinal);
        }

        var readKeys = await _db.AdminNotifications
            .AsNoTracking()
            .Where(notification =>
                notification.ReadAtUtc != null &&
                notification.Type == ProviderApplicationSubmittedType &&
                candidateNotificationKeys.Contains(notification.NotificationKey))
            .Select(notification => notification.NotificationKey)
            .ToListAsync(cancellationToken);

        return readKeys.ToHashSet(StringComparer.Ordinal);
    }

    private async Task<bool> NotificationKeyExistsAsync(string notificationId, CancellationToken cancellationToken = default)
    {
        return await _db.AdminNotifications
            .AsNoTracking()
            .AnyAsync(notification => notification.NotificationKey == notificationId, cancellationToken);
    }

    private void DetachPendingAdminNotification(string notificationId)
    {
        foreach (var entry in _db.ChangeTracker.Entries<AdminNotification>()
            .Where(entry => entry.Entity.NotificationKey == notificationId && entry.State is EntityState.Added or EntityState.Modified))
        {
            entry.State = EntityState.Detached;
        }
    }

    private static AdminNotificationDto ToProviderApplicationNotification(Guid applicationId, string basicProfileJson, DateTimeOffset createdAtUtc)
    {
        var displayName = ReadDisplayName(basicProfileJson);
        return new AdminNotificationDto(
            $"provider-application-submitted-{applicationId:N}",
            "Provider application submitted",
            $"{displayName} submitted an onboarding application.",
            $"/dashboard/admin/provider-applications/{applicationId}",
            createdAtUtc,
            null);
    }

    private static AdminNotificationDto ToDto(AdminNotification notification)
    {
        return new AdminNotificationDto(
            notification.NotificationKey,
            notification.Title,
            notification.Body,
            notification.LinkPath,
            notification.CreatedAtUtc,
            notification.ReadAtUtc);
    }

    private static string ResolveType(string notificationId)
    {
        return notificationId.StartsWith("provider-application-submitted-", StringComparison.Ordinal)
            ? ProviderApplicationSubmittedType
            : "AdminNotification";
    }

    private static string ReadDisplayName(string basicProfileJson)
    {
        if (string.IsNullOrWhiteSpace(basicProfileJson))
        {
            return "A provider";
        }

        try
        {
            using var document = JsonDocument.Parse(basicProfileJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return "A provider";
            }

            return ReadOptionalString(document.RootElement, "displayName") ??
                ReadOptionalString(document.RootElement, "legalName") ??
                "A provider";
        }
        catch (JsonException)
        {
            return "A provider";
        }
    }

    private static string? ReadOptionalString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property) &&
            property.ValueKind == JsonValueKind.String &&
            !string.IsNullOrWhiteSpace(property.GetString())
            ? property.GetString()
            : null;
    }
}

public sealed record AdminNotificationDto(
    string Id,
    string Title,
    string Body,
    string LinkPath,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ReadAtUtc);
