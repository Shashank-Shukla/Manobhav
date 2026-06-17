using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WebApi.Security;

public sealed record EmailOtpChallenge(string Session, string Flow);

public interface ICognitoEmailOtpAuth
{
    Task<EmailOtpChallenge> RequestAsync(EmailOtpAuthRequest request, CancellationToken cancellationToken);

    Task<CognitoTokenSet> VerifyAsync(EmailOtpVerifyRequest request, string session, CancellationToken cancellationToken);
}

public sealed class CognitoEmailOtpAuthService(HttpClient httpClient, AuthOptions options) : ICognitoEmailOtpAuth
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<EmailOtpChallenge> RequestAsync(EmailOtpAuthRequest request, CancellationToken cancellationToken)
    {
        return request.Flow switch
        {
            "sign-in" => await RequestSignInOtpAsync(request.Email, cancellationToken),
            "sign-up" => await RequestSignUpOtpAsync(request.Email, cancellationToken),
            _ => throw new CognitoEmailOtpException("Unsupported email OTP flow.")
        };
    }

    public async Task<CognitoTokenSet> VerifyAsync(EmailOtpVerifyRequest request, string session, CancellationToken cancellationToken)
    {
        return request.Flow switch
        {
            "sign-in" => await VerifySignInOtpAsync(request.Email, request.Otp, session, cancellationToken),
            "sign-up" => await VerifySignUpOtpAsync(request.Email, request.Otp, session, cancellationToken),
            _ => throw new CognitoEmailOtpException("Unsupported email OTP flow.")
        };
    }

    private async Task<EmailOtpChallenge> RequestSignInOtpAsync(string email, CancellationToken cancellationToken)
    {
        var response = await InitiateEmailOtpAuthAsync(email, session: null, cancellationToken);
        if (!string.Equals(response.ChallengeName, "EMAIL_OTP", StringComparison.Ordinal) ||
            string.IsNullOrWhiteSpace(response.Session))
        {
            throw new CognitoEmailOtpException("Cognito did not start an email OTP challenge.");
        }

        return new EmailOtpChallenge(response.Session, "sign-in");
    }

    private async Task<EmailOtpChallenge> RequestSignUpOtpAsync(string email, CancellationToken cancellationToken)
    {
        var response = await PostCognitoAsync<CognitoSignUpResponse>(
            "SignUp",
            new
            {
                ClientId = options.Audience,
                Username = email,
                UserAttributes = new[] { new { Name = "email", Value = email } }
            },
            cancellationToken);

        if (string.IsNullOrWhiteSpace(response.Session))
        {
            throw new CognitoEmailOtpException("Cognito did not return a sign-up session.");
        }

        return new EmailOtpChallenge(response.Session, "sign-up");
    }

    private async Task<CognitoTokenSet> VerifySignInOtpAsync(string email, string otp, string session, CancellationToken cancellationToken)
    {
        var response = await RespondToEmailOtpChallengeAsync(email, otp, session, cancellationToken);
        return CreateTokenSet(response.AuthenticationResult);
    }

    private async Task<CognitoTokenSet> VerifySignUpOtpAsync(string email, string otp, string session, CancellationToken cancellationToken)
    {
        var confirmResponse = await PostCognitoAsync<CognitoSessionResponse>(
            "ConfirmSignUp",
            new
            {
                ClientId = options.Audience,
                Username = email,
                ConfirmationCode = otp,
                Session = session
            },
            cancellationToken);

        var authResponse = await InitiateEmailOtpAuthAsync(email, confirmResponse.Session, cancellationToken);
        if (authResponse.AuthenticationResult is not null)
        {
            return CreateTokenSet(authResponse.AuthenticationResult);
        }

        if (string.Equals(authResponse.ChallengeName, "EMAIL_OTP", StringComparison.Ordinal) &&
            !string.IsNullOrWhiteSpace(authResponse.Session))
        {
            var challengeResponse = await RespondToEmailOtpChallengeAsync(email, otp, authResponse.Session, cancellationToken);
            return CreateTokenSet(challengeResponse.AuthenticationResult);
        }

        throw new CognitoEmailOtpException("Cognito did not complete email OTP registration.");
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

    private sealed class CognitoSignUpResponse
    {
        public string? Session { get; init; }
    }

    private sealed class CognitoSessionResponse
    {
        public string? Session { get; init; }
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
