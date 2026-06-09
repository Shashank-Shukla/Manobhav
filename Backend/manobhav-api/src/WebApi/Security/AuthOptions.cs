namespace WebApi.Security;

public sealed class AuthOptions
{
    public bool Enabled { get; set; }
    public string CognitoAuthority { get; set; } = "";
    public string Audience { get; set; } = "";
    public string AdminGroup { get; set; } = "Admin";
    public bool RequireHttpsMetadata { get; set; } = true;
}
