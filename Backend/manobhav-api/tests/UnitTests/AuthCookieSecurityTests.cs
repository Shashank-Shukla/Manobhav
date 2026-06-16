using System.Net;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using WebApi.Controllers;
using WebApi.Security;

namespace UnitTests;

public sealed class AuthCookieSecurityTests
{
    [Fact]
    public async Task Callback_SetsHttpOnlyAuthCookieAndReadableCsrfCookieWithoutReturningTokens()
    {
        var options = CreateOptions();
        var accessToken = CreateJwt("""{"cognito:groups":["Admin","Provider"]}""");
        var controller = new AuthController(
            new StubCognitoTokenExchange(new CognitoTokenSet(accessToken, "id-token", "refresh-token", 900)),
            new AuthCookieManager(options))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        var result = await controller.CompleteCallback(
            new AuthCallbackRequest("auth-code", "code-verifier", "https://app.example.com/callback"),
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var session = Assert.IsType<AuthSessionResponse>(ok.Value);
        Assert.True(session.IsAuthenticated);
        Assert.Contains("Admin", session.Groups);
        Assert.DoesNotContain(session.GetType().GetProperties(), property => property.Name.Contains("Token", StringComparison.OrdinalIgnoreCase));

        var setCookie = controller.Response.Headers.SetCookie.ToArray();
        Assert.Contains(setCookie, value => HasCookieAttribute(value, accessToken, "httponly"));
        Assert.Contains(setCookie, value => HasCookieAttribute(value, accessToken, "secure"));
        Assert.Contains(setCookie, value => HasCookieAttribute(value, accessToken, "samesite=lax"));
        Assert.Contains(setCookie, value => IsReadableCsrfCookie(value));
    }

    [Fact]
    public async Task Session_ReturnsClaimsWithoutTokens()
    {
        var controller = new AuthController(new StubCognitoTokenExchange(), new AuthCookieManager(CreateOptions()))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim("sub", "user-1"),
                        new Claim("cognito:groups", "Admin Provider"),
                        new Claim("exp", DateTimeOffset.UtcNow.AddMinutes(15).ToUnixTimeSeconds().ToString())
                    ], "TestAuth"))
                }
            }
        };

        var result = controller.Session();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var session = Assert.IsType<AuthSessionResponse>(ok.Value);
        Assert.True(session.IsAuthenticated);
        Assert.Contains("Admin", session.Groups);
        Assert.DoesNotContain(session.GetType().GetProperties(), property => property.Name.Contains("Token", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CookieAuthTokenResolver_UsesCookieAndRejectsBearerFallback()
    {
        var options = CreateOptions();
        var cookieContext = new DefaultHttpContext();
        cookieContext.Request.Headers.Cookie = "mbv_auth=cookie-token";
        cookieContext.Request.Headers.Authorization = "Bearer browser-token";

        var cookieResult = CookieAuthTokenResolver.Resolve(cookieContext.Request, options);

        Assert.Equal("cookie-token", cookieResult.Token);
        Assert.False(cookieResult.ShouldRejectBearer);

        var bearerContext = new DefaultHttpContext();
        bearerContext.Request.Headers.Authorization = "Bearer browser-token";

        var bearerResult = CookieAuthTokenResolver.Resolve(bearerContext.Request, options);

        Assert.Null(bearerResult.Token);
        Assert.True(bearerResult.ShouldRejectBearer);
    }

    [Fact]
    public async Task CsrfMiddleware_RejectsUnsafeCookieAuthenticatedRequestWithoutMatchingHeader()
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Path = "/api/admin/dashboard";
        context.Request.Headers.Cookie = "mbv_auth=access-token; mbv_csrf=csrf-cookie";
        var nextCalled = false;
        var middleware = new CsrfProtectionMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, CreateOptions());

        await middleware.InvokeAsync(context);

        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
    }

    [Fact]
    public async Task CsrfMiddleware_AllowsUnsafeCookieAuthenticatedRequestWithMatchingHeader()
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Path = "/api/admin/dashboard";
        context.Request.Headers.Cookie = "mbv_auth=access-token; mbv_csrf=csrf-cookie";
        context.Request.Headers["X-CSRF-Token"] = "csrf-cookie";
        var nextCalled = false;
        var middleware = new CsrfProtectionMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, CreateOptions());

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
        Assert.NotEqual(StatusCodes.Status400BadRequest, context.Response.StatusCode);
    }

    [Fact]
    public async Task CognitoTokenExchangeService_PostsPkceCodeToConfiguredTokenEndpoint()
    {
        var handler = new RecordingHandler("""{"access_token":"access","id_token":"id","refresh_token":"refresh","expires_in":3600}""");
        var service = new CognitoTokenExchangeService(new HttpClient(handler), CreateOptions());

        var tokens = await service.ExchangeCodeAsync(
            new AuthCallbackRequest("auth-code", "code-verifier", "https://app.example.com/callback"),
            CancellationToken.None);

        Assert.Equal("access", tokens.AccessToken);
        Assert.Equal(new Uri("https://cognito.example.com/oauth2/token"), handler.Request?.RequestUri);
        var body = await handler.ReadBodyAsync();
        Assert.Contains("grant_type=authorization_code", body);
        Assert.Contains("client_id=client-id", body);
        Assert.Contains("code=auth-code", body);
        Assert.Contains("code_verifier=code-verifier", body);
        Assert.Contains("redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback", body);
        Assert.DoesNotContain("client_secret", body);
    }

    private static AuthOptions CreateOptions()
    {
        return new AuthOptions
        {
            Enabled = true,
            Audience = "client-id",
            CognitoAuthority = "https://issuer.example.com",
            CognitoDomain = "https://cognito.example.com"
        };
    }

    private static string CreateJwt(string payloadJson)
    {
        return $"header.{Base64Url(Encoding.UTF8.GetBytes(payloadJson))}.signature";
    }

    private static bool HasCookieAttribute(string? value, string accessToken, string attribute)
    {
        return value is not null &&
               value.StartsWith($"mbv_auth={accessToken}", StringComparison.Ordinal) &&
               value.Contains(attribute, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsReadableCsrfCookie(string? value)
    {
        return value is not null &&
               value.StartsWith("mbv_csrf=", StringComparison.Ordinal) &&
               !value.Contains("httponly", StringComparison.OrdinalIgnoreCase);
    }

    private static string Base64Url(byte[] bytes)
    {
        return Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private sealed class StubCognitoTokenExchange(CognitoTokenSet? tokens = null) : ICognitoTokenExchange
    {
        private readonly CognitoTokenSet _tokens = tokens ?? new CognitoTokenSet("access-token", null, null, 900);

        public Task<CognitoTokenSet> ExchangeCodeAsync(AuthCallbackRequest request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_tokens);
        }
    }

    private sealed class RecordingHandler(string responseJson) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson)
            });
        }

        public async Task<string> ReadBodyAsync()
        {
            return Request?.Content is null ? "" : await Request.Content.ReadAsStringAsync();
        }
    }
}
