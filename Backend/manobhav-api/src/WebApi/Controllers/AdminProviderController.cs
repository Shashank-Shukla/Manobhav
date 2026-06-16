using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
            .Select(item => new ProviderApplicationDto(item.Id, item.UserId, item.Status, item.CurrentStep, item.CreatedAtUtc, item.UpdatedAtUtc, item.SubmittedAtUtc))
            .ToListAsync(cancellationToken);
        return Ok(applications);
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
}
