using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/provider-applications")]
public sealed class AdminProviderController : ControllerBase
{
    private readonly IProviderApplicationAdminService _service;

    public AdminProviderController(IProviderApplicationAdminService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProviderApplicationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProviderApplicationDto>>> List(CancellationToken cancellationToken = default)
    {
        return Ok(await _service.ListAsync(cancellationToken));
    }

    [HttpGet("{applicationId:guid}")]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid applicationId, CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _service.GetAsync(applicationId, cancellationToken));
        }
        catch (ProviderApplicationException exception)
        {
            return MapException(exception);
        }
    }

    [HttpPost("{applicationId:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Approve(Guid applicationId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _service.ApproveAsync(applicationId, cancellationToken);
            return NoContent();
        }
        catch (ProviderApplicationException exception)
        {
            return MapException(exception);
        }
    }

    [HttpPut("{applicationId:guid}/sections/{sectionKey}/review")]
    [ProducesResponseType(typeof(ProviderApplicationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SaveSectionReview(
        Guid applicationId,
        string sectionKey,
        ProviderApplicationSectionReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _service.SaveSectionReviewAsync(applicationId, sectionKey, request, cancellationToken));
        }
        catch (ProviderApplicationException exception)
        {
            return MapException(exception);
        }
    }

    [HttpPost("{applicationId:guid}/needs-changes")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> NeedsChanges(Guid applicationId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _service.NeedsChangesAsync(applicationId, cancellationToken);
            return NoContent();
        }
        catch (ProviderApplicationException exception)
        {
            return MapException(exception);
        }
    }

    [HttpPost("{applicationId:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reject(Guid applicationId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _service.RejectAsync(applicationId, cancellationToken);
            return NoContent();
        }
        catch (ProviderApplicationException exception)
        {
            return MapException(exception);
        }
    }

    [HttpPost("{applicationId:guid}/suspend")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Suspend(Guid applicationId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _service.SuspendAsync(applicationId, cancellationToken);
            return NoContent();
        }
        catch (ProviderApplicationException exception)
        {
            return MapException(exception);
        }
    }

    [HttpPost("/api/admin/provider-profiles/{providerProfileId:guid}/publish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Publish(Guid providerProfileId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _service.PublishProfileAsync(providerProfileId, cancellationToken);
            return NoContent();
        }
        catch (ProviderApplicationException exception)
        {
            return MapException(exception);
        }
    }

    [HttpPost("/api/admin/provider-profiles/{providerProfileId:guid}/unpublish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unpublish(Guid providerProfileId, CancellationToken cancellationToken = default)
    {
        try
        {
            await _service.UnpublishProfileAsync(providerProfileId, cancellationToken);
            return NoContent();
        }
        catch (ProviderApplicationException exception)
        {
            return MapException(exception);
        }
    }

    private IActionResult MapException(ProviderApplicationException exception)
    {
        return exception.StatusCode == StatusCodes.Status404NotFound
            ? NotFound()
            : Problem(title: exception.Message, detail: exception.Detail, statusCode: exception.StatusCode);
    }
}
