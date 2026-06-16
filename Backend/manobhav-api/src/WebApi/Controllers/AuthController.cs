using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApi.Security;

namespace WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(ICognitoTokenExchange tokenExchange, AuthCookieManager cookies) : ControllerBase
{
    [HttpPost("callback")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthSessionResponse>> CompleteCallback(
        [FromBody] AuthCallbackRequest? request,
        CancellationToken cancellationToken)
    {
        if (HasMissingCallbackField(request))
        {
            return Problem(title: "Auth callback request is incomplete.", statusCode: StatusCodes.Status400BadRequest);
        }

        var tokens = await tokenExchange.ExchangeCodeAsync(request!, cancellationToken);
        return Ok(cookies.SignIn(Response, tokens));
    }

    [HttpGet("session")]
    [Authorize]
    public ActionResult<AuthSessionResponse> Session()
    {
        return Ok(cookies.CreateSession(User));
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        cookies.SignOut(Response);
        return NoContent();
    }

    private static bool HasMissingCallbackField(AuthCallbackRequest? request)
    {
        return request is null ||
               string.IsNullOrWhiteSpace(request.Code) ||
               string.IsNullOrWhiteSpace(request.CodeVerifier) ||
               string.IsNullOrWhiteSpace(request.RedirectUri);
    }
}
