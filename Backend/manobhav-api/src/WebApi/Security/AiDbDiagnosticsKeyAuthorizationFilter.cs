using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using WebApi.Configuration;

namespace WebApi.Security;

/// <summary>
/// Gates the diagnostics endpoint. Returns 404 (hiding the route entirely) unless diagnostics is
/// configured (enabled + a key set, expected from SSM) AND the request carries a matching
/// <c>X-Ai-Db-Key</c> header (compared in constant time). Off by default in every environment.
/// </summary>
public sealed class AiDbDiagnosticsKeyAuthorizationFilter : IAuthorizationFilter
{
    public const string HeaderName = "X-Ai-Db-Key";

    private readonly AiDbDiagnosticsOptions _options;

    public AiDbDiagnosticsKeyAuthorizationFilter(IOptions<AiDbDiagnosticsOptions> options)
    {
        _options = options.Value;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        if (!_options.IsConfigured || !IsAuthorized(context.HttpContext.Request.Headers[HeaderName].ToString()))
        {
            context.Result = new NotFoundResult();
        }
    }

    private bool IsAuthorized(string providedKey)
    {
        if (string.IsNullOrEmpty(providedKey))
        {
            return false;
        }

        var provided = Encoding.UTF8.GetBytes(providedKey);
        var expected = Encoding.UTF8.GetBytes(_options.Key!);
        return CryptographicOperations.FixedTimeEquals(provided, expected);
    }
}
