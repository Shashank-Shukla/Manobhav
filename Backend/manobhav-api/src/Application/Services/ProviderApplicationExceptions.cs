namespace Application.Services;

/// <summary>
/// Raised by the provider application admin workflow to signal a non-success outcome. The WebApi
/// layer maps <see cref="StatusCode"/> to the HTTP response, keeping the controller thin and free of
/// business decisions.
/// </summary>
public class ProviderApplicationException : Exception
{
    protected ProviderApplicationException(string message, int statusCode, string? detail)
        : base(message)
    {
        StatusCode = statusCode;
        Detail = detail;
    }

    public int StatusCode { get; }
    public string? Detail { get; }
}

public sealed class ProviderApplicationNotFoundException()
    : ProviderApplicationException("Provider application not found.", 404, null);

public sealed class ProviderApplicationConflictException(string message, string? detail = null)
    : ProviderApplicationException(message, 409, detail);

public sealed class ProviderApplicationValidationException(string message, string? detail = null)
    : ProviderApplicationException(message, 400, detail);
