using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace WebApi.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/provider-applications")]
public sealed class AdminProviderController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public AdminProviderController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProviderApplicationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProviderApplicationDto>>> List(CancellationToken cancellationToken)
    {
        var applications = await _db.ProviderOnboardingApplications
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAtUtc)
            .Take(100)
            .ToListAsync(cancellationToken);
        return Ok(applications.Select(ToDetailDto).ToList());
    }

    [HttpGet("{applicationId:guid}")]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProviderApplicationDto>> Get(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _db.ProviderOnboardingApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        return Ok(ToDetailDto(application));
    }

    [HttpPost("{applicationId:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Approve(Guid applicationId, CancellationToken cancellationToken)
    {
        var application = await _db.ProviderOnboardingApplications.FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        application.Status = "Approved";
        application.ApprovedAtUtc = DateTimeOffset.UtcNow;
        application.ReviewedAtUtc = DateTimeOffset.UtcNow;
        await EnsureRoleAsync(application.UserId, "Provider", cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{applicationId:guid}/needs-changes")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> NeedsChanges(Guid applicationId, CancellationToken cancellationToken)
    {
        return await SetStatusAsync(applicationId, "NeedsChanges", cancellationToken);
    }

    [HttpPost("{applicationId:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reject(Guid applicationId, CancellationToken cancellationToken)
    {
        return await SetStatusAsync(applicationId, "Rejected", cancellationToken);
    }

    [HttpPost("{applicationId:guid}/suspend")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Suspend(Guid applicationId, CancellationToken cancellationToken)
    {
        return await SetStatusAsync(applicationId, "Suspended", cancellationToken);
    }

    [HttpPost("/api/admin/provider-profiles/{providerProfileId:guid}/publish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Publish(Guid providerProfileId, CancellationToken cancellationToken)
    {
        return await SetProfileVisibilityAsync(providerProfileId, "Published", cancellationToken);
    }

    [HttpPost("/api/admin/provider-profiles/{providerProfileId:guid}/unpublish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unpublish(Guid providerProfileId, CancellationToken cancellationToken)
    {
        return await SetProfileVisibilityAsync(providerProfileId, "Unpublished", cancellationToken);
    }

    private async Task<IActionResult> SetStatusAsync(Guid applicationId, string status, CancellationToken cancellationToken)
    {
        var application = await _db.ProviderOnboardingApplications.FirstOrDefaultAsync(item => item.Id == applicationId, cancellationToken);
        if (application is null)
        {
            return NotFound();
        }

        application.Status = status;
        application.ReviewedAtUtc = DateTimeOffset.UtcNow;
        application.UpdatedAtUtc = DateTimeOffset.UtcNow;
        if (status == "Rejected")
        {
            application.RejectedAtUtc = DateTimeOffset.UtcNow;
        }
        if (status == "Suspended")
        {
            application.SuspendedAtUtc = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<IActionResult> SetProfileVisibilityAsync(Guid providerProfileId, string visibility, CancellationToken cancellationToken)
    {
        var profile = await _db.ProviderProfiles.FirstOrDefaultAsync(item => item.Id == providerProfileId, cancellationToken);
        if (profile is null)
        {
            return NotFound();
        }

        profile.VisibilityStatus = visibility;
        profile.PublishedAtUtc = visibility == "Published" ? DateTimeOffset.UtcNow : profile.PublishedAtUtc;
        profile.UnpublishedAtUtc = visibility == "Unpublished" ? DateTimeOffset.UtcNow : profile.UnpublishedAtUtc;
        profile.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task EnsureRoleAsync(Guid userId, string role, CancellationToken cancellationToken)
    {
        var exists = await _db.UserRoles.AnyAsync(item => item.UserId == userId && item.Role == role && item.IsActive, cancellationToken);
        if (!exists)
        {
            await _db.UserRoles.AddAsync(new UserRole { UserId = userId, Role = role }, cancellationToken);
        }
    }

    private static ProviderApplicationDto ToDetailDto(ProviderOnboardingApplication application)
    {
        return new ProviderApplicationDto(
            application.Id,
            application.UserId,
            application.Status,
            application.CurrentStep,
            application.CreatedAtUtc,
            application.UpdatedAtUtc,
            application.SubmittedAtUtc,
            BuildSections(application));
    }

    private static IReadOnlyDictionary<string, JsonElement> BuildSections(ProviderOnboardingApplication application)
    {
        var sections = new Dictionary<string, JsonElement>(StringComparer.Ordinal);

        AddRootSection(sections, "basicIdentity", application.BasicProfileJson);
        AddNestedSection(sections, application.BioJson, "bio", "bioAndApproach");
        AddNestedSection(sections, application.BioJson, "specializations", "specializations");
        AddNestedSection(sections, application.BioJson, "modalities", "therapyApproaches");
        AddNestedSection(sections, application.SessionDetailsJson, "sessionDetails", "sessionDetails");
        AddNestedSection(sections, application.SessionDetailsJson, "credentials", "credentials");
        AddNestedSection(sections, application.SessionDetailsJson, "payout", "payout");

        return sections;
    }

    private static void AddRootSection(IDictionary<string, JsonElement> sections, string sectionKey, string json)
    {
        if (TryParseObject(json, out var element) && element.EnumerateObject().Any())
        {
            sections[sectionKey] = element;
        }
    }

    private static void AddNestedSection(IDictionary<string, JsonElement> sections, string json, string storedKey, string sectionKey)
    {
        if (!TryParseObject(json, out var root) ||
            !root.TryGetProperty(storedKey, out var section) ||
            section.ValueKind != JsonValueKind.Object ||
            !section.EnumerateObject().Any())
        {
            return;
        }

        sections[sectionKey] = section.Clone();
    }

    private static bool TryParseObject(string json, out JsonElement element)
    {
        element = default;
        if (string.IsNullOrWhiteSpace(json))
        {
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            element = document.RootElement.Clone();
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
