using WebApi.Middleware;
using WebApi.Security;
using WebApi.Configuration;
using WebApi.Auditing;
using WebApi.Health;
using WebApi.Notifications;
using Amazon;
using Amazon.SimpleEmailV2;
using Application;
using Application.Services;
using Infrastructure;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// WebApplication.CreateBuilder already loads appsettings.json,
// appsettings.{Environment}.json, environment variables, and command-line args.
builder.Configuration.AddConfiguredSystemsManager(builder.Environment);

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var authOptions = builder.Configuration.GetSection("Auth").Get<AuthOptions>() ?? new AuthOptions();
var visitorAnalyticsOptions = builder.Configuration.GetSection("VisitorAnalytics").Get<VisitorAnalyticsOptions>() ?? new VisitorAnalyticsOptions();

builder.Configuration.ValidateProductionSecretSource(builder.Environment);

if (!builder.Environment.IsDevelopment() && allowedOrigins.Length == 0)
{
    throw new InvalidOperationException("Cors:AllowedOrigins must include at least one origin outside Development.");
}

if (!builder.Environment.IsDevelopment() && !authOptions.Enabled)
{
    throw new InvalidOperationException("Auth:Enabled must be true outside Development.");
}

if (authOptions.Enabled &&
    (string.IsNullOrWhiteSpace(authOptions.CognitoAuthority) ||
     string.IsNullOrWhiteSpace(authOptions.CognitoDomain) ||
     string.IsNullOrWhiteSpace(authOptions.Audience)))
{
    throw new InvalidOperationException("Auth:CognitoAuthority, Auth:CognitoDomain, and Auth:Audience are required when authentication is enabled.");
}

PublicRuntimeConfigReader.ValidateProductionConfig(builder.Configuration, builder.Environment, authOptions.Enabled);

if (!builder.Environment.IsDevelopment() &&
    visitorAnalyticsOptions.FullCaptureEnabled &&
    !visitorAnalyticsOptions.FullCaptureLegalApproved)
{
    throw new InvalidOperationException("VisitorAnalytics:FullCaptureLegalApproved must be true before full visitor capture is enabled outside Development.");
}

if (!builder.Environment.IsDevelopment() &&
    string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
{
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be provided outside Development.");
}

// Add services (Application + Infrastructure registration extension methods)
builder.Services.AddApplicationServices();      // register MediatR, validators, etc.
builder.Services.AddInfrastructureServices(builder.Configuration); // DbContext, repos
builder.Services.AddSingleton(visitorAnalyticsOptions);
builder.Services.AddSingleton(authOptions);
builder.Services.Configure<ProviderOnboardingNotificationOptions>(
    builder.Configuration.GetSection("ProviderOnboarding:AdminNotifications"));
builder.Services.AddSingleton<AuthCookieManager>();
builder.Services.AddHttpClient<ICognitoTokenExchange, CognitoTokenExchangeService>();
builder.Services.AddHttpClient<ICognitoEmailOtpAuth, CognitoEmailOtpAuthService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuditContextAccessor, HttpAuditContextAccessor>();
builder.Services.AddScoped<IDatabaseReadinessProbe, EfCoreDatabaseReadinessProbe>();
builder.Services.AddSingleton<IAmazonSimpleEmailServiceV2>(_ =>
{
    var notificationOptions = builder.Configuration
        .GetSection("ProviderOnboarding:AdminNotifications")
        .Get<ProviderOnboardingNotificationOptions>() ?? new ProviderOnboardingNotificationOptions();
    var region = string.IsNullOrWhiteSpace(notificationOptions.AwsRegion)
        ? ProviderOnboardingNotificationOptions.DefaultAwsRegion
        : notificationOptions.AwsRegion;
    return new AmazonSimpleEmailServiceV2Client(new AmazonSimpleEmailServiceV2Config
    {
        RegionEndpoint = RegionEndpoint.GetBySystemName(region)
    });
});
builder.Services.AddSingleton<IProviderOnboardingSesClient, AwsProviderOnboardingSesClient>();
builder.Services.AddScoped<IProviderOnboardingAdminNotifier, SesProviderOnboardingAdminNotifier>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

if (authOptions.Enabled)
{
    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.MapInboundClaims = false;
            options.Authority = authOptions.CognitoAuthority;
            options.Audience = authOptions.Audience;
            options.RequireHttpsMetadata = authOptions.RequireHttpsMetadata;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = authOptions.CognitoAuthority,
                ValidateAudience = false,
                NameClaimType = "username",
                RoleClaimType = "cognito:groups",
                ClockSkew = TimeSpan.FromMinutes(2)
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var tokenResult = CookieAuthTokenResolver.Resolve(context.Request, authOptions);
                    if (!string.IsNullOrWhiteSpace(tokenResult.Token))
                    {
                        context.Token = tokenResult.Token;
                    }
                    else if (tokenResult.ShouldRejectBearer)
                    {
                        context.Fail("Authorization bearer tokens are not accepted.");
                    }

                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    var tokenUse = context.Principal?.FindFirst("token_use")?.Value;
                    var clientId = context.Principal?.FindFirst("client_id")?.Value;
                    var audience = context.Principal?.FindFirst("aud")?.Value;

                    if (!string.Equals(tokenUse, "access", StringComparison.Ordinal))
                    {
                        context.Fail("Cognito access token is required.");
                        return Task.CompletedTask;
                    }

                    if (!string.Equals(clientId, authOptions.Audience, StringComparison.Ordinal) &&
                        !string.Equals(audience, authOptions.Audience, StringComparison.Ordinal))
                    {
                        context.Fail("Token audience/client_id is invalid.");
                    }

                    return Task.CompletedTask;
                }
            };
        });
}
else
{
    builder.Services
        .AddAuthentication(DisabledAuthenticationHandler.SchemeName)
        .AddScheme<AuthenticationSchemeOptions, DisabledAuthenticationHandler>(DisabledAuthenticationHandler.SchemeName, _ => { });
}

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context =>
            context.User.FindAll("cognito:groups")
                .SelectMany(claim => claim.Value.Split([' ', ',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                .Any(group => string.Equals(group, authOptions.AdminGroup, StringComparison.Ordinal)));
    });

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("ProductionPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = Math.Max(1, builder.Configuration.GetValue("RateLimiting:PermitLimit", 100)),
                Window = TimeSpan.FromSeconds(Math.Max(1, builder.Configuration.GetValue("RateLimiting:WindowSeconds", 60))),
                QueueLimit = 0
            }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

var app = builder.Build();

app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        var exceptionHandlerFeature = context.Features.Get<IExceptionHandlerFeature>();
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalExceptionHandler");
        if (exceptionHandlerFeature?.Error is not null)
        {
            logger.LogError(exceptionHandlerFeature.Error, "Unhandled exception");
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(new
        {
            title = "An unexpected error occurred.",
            status = StatusCodes.Status500InternalServerError,
            traceId = context.TraceIdentifier
        });
    });
});

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "0";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
    }
    await next();
});

// global request logging
app.UseMiddleware<LoggingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Manobhav API v1");
        options.RoutePrefix = string.Empty; // serve Swagger UI at root
    });
}

app.UseCors("ProductionPolicy");
app.UseRateLimiter();
app.UseMiddleware<CsrfProtectionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseResponseCompression();

app.MapGet("/health/live", () => Results.Ok(new { status = "live" })).AllowAnonymous();
app.MapGet("/health/ready", async (IDatabaseReadinessProbe readinessProbe, CancellationToken cancellationToken) =>
{
    var readiness = await readinessProbe.CheckAsync(cancellationToken);
    return readiness.IsReady
        ? Results.Ok(new { status = "ready" })
        : Results.Problem(title: readiness.FailureTitle, statusCode: StatusCodes.Status503ServiceUnavailable);
}).AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();
app.MapControllers();
app.Run();

public partial class Program
{
}
