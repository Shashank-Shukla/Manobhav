namespace WebApi.Configuration;

public sealed class AwsSystemsManagerOptions
{
    public bool Enabled { get; set; }
    public string Path { get; set; } = "";
    public bool Optional { get; set; } = true;
    public int ReloadAfterMinutes { get; set; } = 5;
}
