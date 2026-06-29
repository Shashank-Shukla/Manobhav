using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public")]
public sealed class PublicContentController : ControllerBase
{
    private readonly IPublicContentService _content;

    public PublicContentController(IPublicContentService content)
    {
        _content = content;
    }

    [HttpGet("landing")]
    [ProducesResponseType(typeof(LandingContentResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<LandingContentResponse>> GetLanding(CancellationToken cancellationToken = default)
    {
        return Ok(await _content.GetLandingAsync(cancellationToken));
    }

    [HttpGet("visitor-flow")]
    [ProducesResponseType(typeof(VisitorFlowResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<VisitorFlowResponse>> GetVisitorFlow([FromQuery] string flowKey = "default", CancellationToken cancellationToken = default)
    {
        return Ok(await _content.GetVisitorFlowAsync(flowKey, cancellationToken));
    }

    [HttpGet("providers")]
    [ProducesResponseType(typeof(IReadOnlyList<ProviderDirectoryItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProviderDirectoryItemDto>>> GetProviders(
        [FromQuery] bool featured = false,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _content.GetProvidersAsync(featured, limit, cancellationToken));
    }
}
