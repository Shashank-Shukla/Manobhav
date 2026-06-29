using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.Controllers;

[ApiController]
// Admin-only: this endpoint can fetch any user by id. Restricting it to the
// AdminOnly policy closes the IDOR where any authenticated user could read
// other users' records. Self-service profile reads use /api/auth/session.
[Authorize(Policy = "AdminOnly")]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _svc;

    public UsersController(IUserService svc)
    {
        _svc = svc;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _svc.GetUserDtoAsync(id, cancellationToken);
        return user == null ? NotFound() : Ok(user);
    }
}
