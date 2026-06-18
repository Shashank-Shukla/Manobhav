using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;

namespace WebApi.Security;

public sealed record EmailOtpChallenge(string Session, string Flow);

public interface ICognitoEmailOtpAuth
{
    Task<bool> UserExistsAsync(string email, CancellationToken cancellationToken);

    Task CreatePasswordlessUserAsync(string email, CancellationToken cancellationToken);

    Task DeletePasswordlessUserAsync(string email, CancellationToken cancellationToken);

    Task<EmailOtpChallenge> RequestSignInOtpAsync(string email, CancellationToken cancellationToken);

    Task<CognitoTokenSet> VerifySignInOtpAsync(string email, string otp, string session, CancellationToken cancellationToken);
}

public sealed class CognitoEmailOtpAuthService(
    HttpClient httpClient,
    AuthOptions options,
    IAmazonCognitoIdentityProvider? cognitoClient = null) : ICognitoEmailOtpAuth
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<bool> UserExistsAsync(string email, CancellationToken cancellationToken)
    {
        if (cognitoClient is null || string.IsNullOrWhiteSpace(options.UserPoolId))
        {
            return false;
        }

        try
        {
            await cognitoClient.AdminGetUserAsync(new AdminGetUserRequest
            {
                UserPoolId = options.UserPoolId,
                Username = email
            }, cancellationToken);
            return true;
        }
        catch (UserNotFoundException)
        {
            return false;
        }
    }

    public async Task CreatePasswordlessUserAsync(string email, CancellationToken cancellationToken)
    {
        if (cognitoClient is null || string.IsNullOrWhiteSpace(options.UserPoolId))
        {
            throw new CognitoEmailOtpException("Cognito user pool is not configured.");
        }

        try
        {
            await cognitoClient.AdminCreateUserAsync(new AdminCreateUserRequest
            {
                UserPoolId = options.UserPoolId,
                Username = email,
                MessageAction = MessageActionType.SUPPRESS,
                DesiredDeliveryMediums = [DeliveryMediumType.EMAIL],
                UserAttributes =
                [
                    new AttributeType { Name = "email", Value = email },
                    new AttributeType { Name = "email_verified", Value = "true" }
                ]
            }, cancellationToken);
        }
        catch (UsernameExistsException exception)
        {
            throw new CognitoEmailOtpException(exception.Message, nameof(UsernameExistsException));
        }
        catch (AliasExistsException exception)
        {
            throw new CognitoEmailOtpException(exception.Message, nameof(AliasExistsException));
        }
    }

    public async Task DeletePasswordlessUserAsync(string email, CancellationToken cancellationToken)
    {
        if (cognitoClient is null || string.IsNullOrWhiteSpace(options.UserPoolId))
        {
            return;
        }

        try
        {
            await cognitoClient.AdminDeleteUserAsync(new AdminDeleteUserRequest
            {
                UserPoolId = options.UserPoolId,
                Username = email
            }, cancellationToken);
        }
        catch (UserNotFoundException)
        {
        }
    }

    public async Task<EmailOtpChallenge> RequestSignInOtpAsync(string email, CancellationToken cancellationToken)
    {
        var response = await InitiateEmailOtpAuthAsync(email, session: null, cancellationToken);
        if (!string.Equals(response.ChallengeName, "EMAIL_OTP", StringComparison.Ordinal) ||
            string.IsNullOrWhiteSpace(response.Session))
        {
            throw new CognitoEmailOtpException("Cognito did not start an email OTP challenge.");
        }

        return new EmailOtpChallenge(response.Session, "sign-in");
    }

    public async Task<CognitoTokenSet> VerifySignInOtpAsync(string email, string otp, string session, CancellationToken cancellationToken)
    {
        var response = await RespondToEmailOtpChallengeAsync(email, otp, session, cancellationToken);
        return CreateTokenSet(response.AuthenticationResult);
    }

    private Task<CognitoAuthResponse> InitiateEmailOtpAuthAsync(string email, string? session, CancellationToken cancellationToken)
    {
        return PostCognitoAsync<CognitoAuthResponse>(
            "InitiateAuth",
            new
            {
                AuthFlow = "USER_AUTH",
                ClientId = options.Audience,
                AuthParameters = new Dictionary<string, string>
                {
                    ["USERNAME"] = email,
                    ["PREFERRED_CHALLENGE"] = "EMAIL_OTP"
                },
                Session = session
            },
            cancellationToken);
    }

    private Task<CognitoAuthResponse> RespondToEmailOtpChallengeAsync(string email, string otp, string session, CancellationToken cancellationToken)
    {
        return PostCognitoAsync<CognitoAuthResponse>(
            "RespondToAuthChallenge",
            new
            {
                ChallengeName = "EMAIL_OTP",
                ClientId = options.Audience,
                ChallengeResponses = new Dictionary<string, string>
                {
                    ["USERNAME"] = email,
                    ["EMAIL_OTP_CODE"] = otp
                },
                Session = session
            },
            cancellationToken);
    }

    private async Task<T> PostCognitoAsync<T>(string target, object body, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, BuildCognitoApiEndpoint())
        {
            Content = JsonContent.Create(body, mediaType: new MediaTypeHeaderValue("application/x-amz-json-1.1"), options: JsonOptions)
        };
        request.Headers.TryAddWithoutValidation("X-Amz-Target", $"AWSCognitoIdentityProviderService.{target}");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/x-amz-json-1.1"));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var error = await ReadCognitoErrorAsync(response, cancellationToken);
            throw new CognitoEmailOtpException(error.Message, error.Type);
        }

        var payload = await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken);
        return payload ?? throw new CognitoEmailOtpException("Cognito returned an empty response.");
    }

    private Uri BuildCognitoApiEndpoint()
    {
        return new Uri(new Uri(options.CognitoAuthority, UriKind.Absolute).GetLeftPart(UriPartial.Authority), UriKind.Absolute);
    }

    private static CognitoTokenSet CreateTokenSet(CognitoAuthenticationResult? result)
    {
        if (result is null || string.IsNullOrWhiteSpace(result.AccessToken))
        {
            throw new CognitoEmailOtpException("Cognito did not return an authenticated session.");
        }

        return new CognitoTokenSet(result.AccessToken, result.IdToken, result.RefreshToken, Math.Max(1, result.ExpiresIn));
    }

    private static async Task<(string Type, string Message)> ReadCognitoErrorAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            var payload = await response.Content.ReadFromJsonAsync<CognitoErrorResponse>(JsonOptions, cancellationToken);
            var type = payload?.Type ?? "";
            var message = string.IsNullOrWhiteSpace(payload?.Message) ? "Cognito email OTP request failed." : payload!.Message;
            return (type, message);
        }
        catch (JsonException)
        {
            return ("", "Cognito email OTP request failed.");
        }
    }

    private sealed class CognitoAuthResponse
    {
        public CognitoAuthenticationResult? AuthenticationResult { get; init; }

        public string? ChallengeName { get; init; }

        public string? Session { get; init; }
    }

    private sealed class CognitoAuthenticationResult
    {
        public string AccessToken { get; init; } = "";

        public int ExpiresIn { get; init; }

        public string? IdToken { get; init; }

        public string? RefreshToken { get; init; }
    }

    private sealed class CognitoErrorResponse
    {
        [JsonPropertyName("__type")]
        public string Type { get; init; } = "";

        public string Message { get; init; } = "";
    }
}

public sealed class CognitoEmailOtpException : Exception
{
    public CognitoEmailOtpException(string message, string errorType = "") : base(message)
    {
        ErrorType = errorType;
    }

    public string ErrorType { get; }
}
