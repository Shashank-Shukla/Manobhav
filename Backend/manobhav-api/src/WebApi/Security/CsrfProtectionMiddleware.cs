using Microsoft.AspNetCore.Http;

namespace WebApi.Security;

public sealed class CsrfProtectionMiddleware(RequestDelegate next, AuthOptions options)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (!RequiresValidation(context.Request))
        {
            await next(context);
            return;
        }

        if (HasMatchingCsrfToken(context.Request))
        {
            await next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new
        {
            title = "CSRF token validation failed.",
            status = StatusCodes.Status400BadRequest
        }, context.RequestAborted);
    }

    private bool RequiresValidation(HttpRequest request)
    {
        return IsUnsafeMethod(request.Method) &&
               request.Path.StartsWithSegments("/api") &&
               !request.Path.StartsWithSegments("/api/auth/callback") &&
               request.Cookies.ContainsKey(options.AccessTokenCookieName);
    }

    private bool HasMatchingCsrfToken(HttpRequest request)
    {
        return request.Cookies.TryGetValue(options.CsrfCookieName, out var cookieToken) &&
               request.Headers.TryGetValue(options.CsrfHeaderName, out var headerTokens) &&
               headerTokens.Any(header => string.Equals(header, cookieToken, StringComparison.Ordinal));
    }

    private static bool IsUnsafeMethod(string method)
    {
        return HttpMethods.IsPost(method) ||
               HttpMethods.IsPut(method) ||
               HttpMethods.IsPatch(method) ||
               HttpMethods.IsDelete(method);
    }
}
