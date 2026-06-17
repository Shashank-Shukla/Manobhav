using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApi.Configuration;

namespace WebApi.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public/runtime-config")]
public sealed class PublicRuntimeConfigController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public PublicRuntimeConfigController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PublicRuntimeConfigResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public IActionResult Get()
    {
        var result = PublicRuntimeConfigReader.Read(_configuration, _configuration.GetValue<bool>("Auth:Enabled"));
        if (!result.IsComplete)
        {
            return Problem(
                title: PublicRuntimeConfigReader.BuildIncompleteMessage(result.MissingKeys),
                statusCode: StatusCodes.Status500InternalServerError);
        }

        return Ok(result.Response);
    }
}
