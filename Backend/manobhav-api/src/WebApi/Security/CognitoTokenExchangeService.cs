using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace WebApi.Security;

public interface ICognitoTokenExchange
{
    Task<CognitoTokenSet> ExchangeCodeAsync(AuthCallbackRequest request, CancellationToken cancellationToken);
}

public sealed class CognitoTokenExchangeService(HttpClient httpClient, AuthOptions options) : ICognitoTokenExchange
{
    public async Task<CognitoTokenSet> ExchangeCodeAsync(AuthCallbackRequest request, CancellationToken cancellationToken)
    {
        using var response = await httpClient.PostAsync(BuildTokenEndpoint(), BuildTokenRequest(request), cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Cognito token exchange failed.");
        }

        var payload = await response.Content.ReadFromJsonAsync<CognitoTokenEndpointResponse>(cancellationToken: cancellationToken);
        return CreateTokenSet(payload);
    }

    private Uri BuildTokenEndpoint()
    {
        return new Uri($"{options.CognitoDomain.TrimEnd('/')}/oauth2/token", UriKind.Absolute);
    }

    private FormUrlEncodedContent BuildTokenRequest(AuthCallbackRequest request)
    {
        return new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["client_id"] = options.Audience,
            ["code"] = request.Code,
            ["redirect_uri"] = request.RedirectUri,
            ["code_verifier"] = request.CodeVerifier
        });
    }

    private static CognitoTokenSet CreateTokenSet(CognitoTokenEndpointResponse? payload)
    {
        if (payload is null || string.IsNullOrWhiteSpace(payload.AccessToken))
        {
            throw new InvalidOperationException("Cognito token response did not include an access token.");
        }

        return new CognitoTokenSet(payload.AccessToken, payload.IdToken, payload.RefreshToken, Math.Max(1, payload.ExpiresIn));
    }

    private sealed class CognitoTokenEndpointResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; init; } = "";

        [JsonPropertyName("id_token")]
        public string? IdToken { get; init; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; init; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; init; }
    }
}
