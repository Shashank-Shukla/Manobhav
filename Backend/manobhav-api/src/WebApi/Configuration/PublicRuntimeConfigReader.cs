using Application.Services;

namespace WebApi.Configuration;

public sealed record PublicRuntimeConfigResponse(
    string ApiBaseUrl,
    PublicAuthRuntimeConfig Auth,
    PublicVisitorAnalyticsRuntimeConfig VisitorAnalytics);

public sealed record PublicAuthRuntimeConfig(
    string CognitoDomain,
    string ClientId,
    string RedirectUri,
    string LogoutUri,
    string Scopes,
    string AdminGroup);

public sealed record PublicVisitorAnalyticsRuntimeConfig(
    bool Enabled,
    bool FullCaptureEnabled,
    bool LegalApproved,
    bool CapturePreciseLocation);

public sealed record PublicRuntimeConfigResult(
    PublicRuntimeConfigResponse Response,
    IReadOnlyList<string> MissingKeys)
{
    public bool IsComplete => MissingKeys.Count == 0;
}

public static class PublicRuntimeConfigReader
{
    public static PublicRuntimeConfigResult Read(IConfiguration configuration, bool authEnabled)
    {
        var response = new PublicRuntimeConfigResponse(
            ReadRequired(configuration, "PublicRuntimeConfig:ApiBaseUrl"),
            new PublicAuthRuntimeConfig(
                ReadRequired(configuration, "Auth:CognitoDomain"),
                ReadRequired(configuration, "Auth:Audience"),
                ReadRequired(configuration, "PublicRuntimeConfig:Auth:RedirectUri"),
                ReadRequired(configuration, "PublicRuntimeConfig:Auth:LogoutUri"),
                ReadRequired(configuration, "PublicRuntimeConfig:Auth:Scopes"),
                ReadRequired(configuration, "Auth:AdminGroup")),
            ReadVisitorAnalyticsConfig(configuration));

        return new PublicRuntimeConfigResult(response, FindMissingKeys(response, authEnabled));
    }

    public static void ValidateProductionConfig(
        IConfiguration configuration,
        IHostEnvironment environment,
        bool authEnabled)
    {
        if (environment.IsDevelopment())
        {
            return;
        }

        var result = Read(configuration, authEnabled);
        if (!result.IsComplete)
        {
            throw new InvalidOperationException(BuildIncompleteMessage(result.MissingKeys));
        }
    }

    public static string BuildIncompleteMessage(IReadOnlyList<string> missingKeys)
    {
        return missingKeys.Count == 0
            ? "Public runtime configuration is incomplete."
            : $"Public runtime configuration is incomplete. Missing keys: {string.Join(", ", missingKeys)}.";
    }

    private static PublicVisitorAnalyticsRuntimeConfig ReadVisitorAnalyticsConfig(IConfiguration configuration)
    {
        var options = configuration.GetSection("VisitorAnalytics").Get<VisitorAnalyticsOptions>() ?? new VisitorAnalyticsOptions();
        return new PublicVisitorAnalyticsRuntimeConfig(
            options.Enabled,
            options.FullCaptureEnabled,
            options.FullCaptureLegalApproved,
            options.CapturePreciseLocation);
    }

    private static IReadOnlyList<string> FindMissingKeys(PublicRuntimeConfigResponse response, bool authEnabled)
    {
        var missing = new List<string>();
        AddIfMissing(missing, "PublicRuntimeConfig:ApiBaseUrl", response.ApiBaseUrl);

        if (authEnabled)
        {
            AddIfMissing(missing, "Auth:CognitoDomain", response.Auth.CognitoDomain);
            AddIfMissing(missing, "Auth:Audience", response.Auth.ClientId);
            AddIfMissing(missing, "PublicRuntimeConfig:Auth:RedirectUri", response.Auth.RedirectUri);
            AddIfMissing(missing, "PublicRuntimeConfig:Auth:LogoutUri", response.Auth.LogoutUri);
            AddIfMissing(missing, "PublicRuntimeConfig:Auth:Scopes", response.Auth.Scopes);
            AddIfMissing(missing, "Auth:AdminGroup", response.Auth.AdminGroup);
        }

        return missing;
    }

    private static void AddIfMissing(List<string> missing, string key, string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            missing.Add(key);
        }
    }

    private static string ReadRequired(IConfiguration configuration, string key)
    {
        return configuration[key]?.Trim() ?? "";
    }
}
