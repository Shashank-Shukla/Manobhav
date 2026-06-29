namespace WebApi.Configuration;

/// <summary>
/// Controls the gated, read-only AI diagnostics endpoint. Off by default: both <see cref="Enabled"/>
/// must be true and a non-empty <see cref="Key"/> must be configured (expected from SSM
/// <c>/manobhav/prod/Diagnostics/*</c>) before any diagnostics route responds. Never commit a key.
/// </summary>
public sealed class DiagnosticsOptions
{
    public const string SectionName = "Diagnostics";

    public bool Enabled { get; set; }

    public string? Key { get; set; }

    public bool IsConfigured => Enabled && !string.IsNullOrWhiteSpace(Key);
}
