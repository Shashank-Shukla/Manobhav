using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebApi.Controllers;
using WebApi.Health;

namespace UnitTests;

public sealed class WebApiPipelineTests
{
    [Fact]
    public async Task ApiHealth_IsAnonymousAndMatchesElasticBeanstalkHealthPath()
    {
        await using var factory = new ManobhavApiFactory();
        using var client = factory.CreateHttpsClient();

        var response = await client.GetAsync("/api/health");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("OK", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AdminDashboard_RequiresAuthenticationAndAdminGroup()
    {
        await using var factory = new ManobhavApiFactory();
        using var client = factory.CreateHttpsClient();

        var anonymous = await client.GetAsync("/api/admin/dashboard");
        var nonAdmin = await client.SendAsync(CreateAuthenticatedRequest(HttpMethod.Get, "/api/admin/dashboard", "Patient"));
        var admin = await client.SendAsync(CreateAuthenticatedRequest(HttpMethod.Get, "/api/admin/dashboard", "Admin"));

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, nonAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.OK, admin.StatusCode);
    }

    [Fact]
    public async Task ProviderOnboardingStart_RequiresAuthenticatedUser()
    {
        await using var factory = new ManobhavApiFactory();
        using var client = factory.CreateHttpsClient();

        var anonymous = await client.PostAsync("/api/provider-onboarding/applications", null);
        var authenticated = await client.SendAsync(CreateAuthenticatedRequest(HttpMethod.Post, "/api/provider-onboarding/applications", "ProviderApplicant"));

        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.Created, authenticated.StatusCode);
    }

    [Fact]
    public async Task ProviderOnboardingStart_AuditsAuthenticatedSubjectWhenOnlySubClaimExists()
    {
        await using var factory = new ManobhavApiFactory();
        using var client = factory.CreateHttpsClient();
        var request = CreateAuthenticatedRequest(
            HttpMethod.Post,
            "/api/provider-onboarding/applications",
            "ProviderApplicant",
            subject: "provider-subject-123");

        var response = await client.SendAsync(request);
        var auditLogs = await factory.ReadAuditLogsAsync();

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Contains(auditLogs, audit =>
            audit.ActorType == "User" &&
            audit.ActorUserId is null &&
            audit.ActorSubject == "provider-subject-123");
    }

    [Fact]
    public async Task AuthSessionAndLogout_UseServerSessionAndCsrfBoundary()
    {
        await using var factory = new ManobhavApiFactory();
        using var client = factory.CreateHttpsClient();

        var anonymousSession = await client.GetAsync("/api/auth/session");
        var session = await client.SendAsync(CreateAuthenticatedRequest(HttpMethod.Get, "/api/auth/session", "Admin"));
        var sessionJson = await session.Content.ReadAsStringAsync();
        var missingCsrf = CreateAuthenticatedRequest(HttpMethod.Post, "/api/auth/logout", "Admin");
        missingCsrf.Headers.Add("Cookie", "mbv_auth=access-token; mbv_csrf=csrf-token");
        var missingCsrfResponse = await client.SendAsync(missingCsrf);
        var logout = CreateAuthenticatedRequest(HttpMethod.Post, "/api/auth/logout", "Admin");
        logout.Headers.Add("Cookie", "mbv_auth=access-token; mbv_csrf=csrf-token");
        logout.Headers.Add("X-CSRF-Token", "csrf-token");
        var logoutResponse = await client.SendAsync(logout);

        Assert.Equal(HttpStatusCode.Unauthorized, anonymousSession.StatusCode);
        Assert.Equal(HttpStatusCode.OK, session.StatusCode);
        Assert.DoesNotContain("accessToken", sessionJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("refreshToken", sessionJson, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.BadRequest, missingCsrfResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, logoutResponse.StatusCode);
        Assert.Contains(logoutResponse.Headers.GetValues("Set-Cookie"), value => value.StartsWith("mbv_auth=", StringComparison.Ordinal));
        Assert.Contains(logoutResponse.Headers.GetValues("Set-Cookie"), value => value.StartsWith("mbv_csrf=", StringComparison.Ordinal));
    }

    [Fact]
    public async Task ReadyHealth_ReturnsServiceUnavailableWhenMigrationsArePending()
    {
        await using var factory = new ManobhavApiFactory(DatabaseReadinessResult.NotReady("Database migrations are pending."));
        using var client = factory.CreateHttpsClient();

        var response = await client.GetAsync("/health/ready");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Contains("pending", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ReadyHealth_ReturnsServiceUnavailableWhenSchemaCheckFails()
    {
        await using var factory = new ManobhavApiFactory(DatabaseReadinessResult.NotReady("Database schema readiness check failed."));
        using var client = factory.CreateHttpsClient();

        var response = await client.GetAsync("/health/ready");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Contains("schema", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task PublicProviders_ReturnsOnlyPublishedActiveFeaturedProvidersWithinLimit()
    {
        await using var factory = new ManobhavApiFactory();
        await factory.SeedAsync(db =>
        {
            var first = Provider("Published Featured", published: true, active: true, featured: true, displayOrder: 2);
            var second = Provider("Earlier Featured", published: true, active: true, featured: true, displayOrder: 1);
            db.ProviderProfiles.AddRange(
                first,
                second,
                Provider("Inactive Featured", published: true, active: false, featured: true, displayOrder: 3),
                Provider("Hidden Featured", published: false, active: true, featured: true, displayOrder: 4),
                Provider("Published Not Featured", published: true, active: true, featured: false, displayOrder: 5));
            db.ProviderAvailabilitySlots.Add(new ProviderAvailabilitySlot
            {
                ProviderProfileId = first.Id,
                StartsAtUtc = DateTimeOffset.UtcNow.AddDays(1),
                EndsAtUtc = DateTimeOffset.UtcNow.AddDays(1).AddMinutes(45),
                Status = "Available"
            });
        });
        using var client = factory.CreateHttpsClient();

        var providers = await client.GetFromJsonAsync<IReadOnlyList<ProviderDirectoryItemDto>>("/api/public/providers?featured=true&limit=1");

        Assert.NotNull(providers);
        var provider = Assert.Single(providers);
        Assert.Equal("Earlier Featured", provider.Name);
    }

    private static HttpRequestMessage CreateAuthenticatedRequest(
        HttpMethod method,
        string uri,
        string groups,
        string subject = "test-user")
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add("X-Test-Subject", subject);
        request.Headers.Add("X-Test-Groups", groups);
        return request;
    }

    private static ProviderProfile Provider(string name, bool published, bool active, bool featured, int displayOrder)
    {
        return new ProviderProfile
        {
            Name = name,
            DisplayName = name,
            Role = "Therapist",
            Summary = "MVP provider",
            LongDescription = "MVP provider profile.",
            SpecializationsJson = """["Anxiety"]""",
            AvatarColor = "#9CAF88",
            VisibilityStatus = published ? "Published" : "Hidden",
            IsActive = active,
            IsFeatured = featured,
            DisplayOrder = displayOrder
        };
    }

    private sealed class ManobhavApiFactory : WebApplicationFactory<Program>
    {
        private readonly string _databaseName = $"manobhav-api-test-{Guid.NewGuid():N}";
        private readonly DatabaseReadinessResult? _readinessResult;

        public ManobhavApiFactory(DatabaseReadinessResult? readinessResult = null)
        {
            _readinessResult = readinessResult;
        }

        public HttpClient CreateHttpsClient()
        {
            return CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });
        }

        public async Task SeedAsync(Action<ApplicationDbContext> seed)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureCreatedAsync();
            seed(db);
            await db.SaveChangesAsync();
        }

        public async Task<List<AuditLog>> ReadAuditLogsAsync()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureCreatedAsync();
            return await db.AuditLogs.ToListAsync();
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Auth:Enabled"] = "true",
                    ["Auth:CognitoAuthority"] = "https://issuer.example.com",
                    ["Auth:CognitoDomain"] = "https://cognito.example.com",
                    ["Auth:Audience"] = "test-client-id",
                    ["Auth:AdminGroup"] = "Admin",
                    ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Port=5432;Database=ignored;Username=ignored;Password=ignored",
                    ["Cors:AllowedOrigins:0"] = "https://manobhav.co.in"
                });
            });
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<ApplicationDbContext>();
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
                services.AddDbContext<ApplicationDbContext>(options => options.UseInMemoryDatabase(_databaseName));
                if (_readinessResult is not null)
                {
                    services.RemoveAll<IDatabaseReadinessProbe>();
                    services.AddScoped<IDatabaseReadinessProbe>(_ => new StubReadinessProbe(_readinessResult));
                }

                services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestAuthenticationHandler.SchemeName;
                        options.DefaultChallengeScheme = TestAuthenticationHandler.SchemeName;
                        options.DefaultForbidScheme = TestAuthenticationHandler.SchemeName;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(TestAuthenticationHandler.SchemeName, _ => { });
            });
        }
    }

    private sealed class StubReadinessProbe : IDatabaseReadinessProbe
    {
        private readonly DatabaseReadinessResult _result;

        public StubReadinessProbe(DatabaseReadinessResult result)
        {
            _result = result;
        }

        public Task<DatabaseReadinessResult> CheckAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_result);
        }
    }

    private sealed class TestAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public const string SchemeName = "TestAuth";

        public TestAuthenticationHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder) : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("X-Test-Subject", out var subjectValues))
            {
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var subject = subjectValues.ToString();
            if (string.IsNullOrWhiteSpace(subject))
            {
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var claims = new List<Claim>
            {
                new("sub", subject),
                new("email", $"{subject}@example.com"),
                new("exp", DateTimeOffset.UtcNow.AddMinutes(30).ToUnixTimeSeconds().ToString())
            };

            if (Request.Headers.TryGetValue("X-Test-Groups", out var groupValues))
            {
                var groups = groupValues.ToString();
                if (!string.IsNullOrWhiteSpace(groups))
                {
                    claims.Add(new Claim("cognito:groups", groups));
                }
            }

            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
        }
    }
}
