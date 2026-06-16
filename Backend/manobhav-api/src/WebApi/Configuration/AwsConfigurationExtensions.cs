using Amazon.Extensions.Configuration.SystemsManager;

namespace WebApi.Configuration;

public static class AwsConfigurationExtensions
{
    public static void AddConfiguredSystemsManager(this ConfigurationManager configuration, IHostEnvironment environment)
    {
        var options = configuration.GetSection("AWS:SystemsManager").Get<AwsSystemsManagerOptions>() ?? new AwsSystemsManagerOptions();
        if (!options.Enabled)
        {
            return;
        }

        ValidateSystemsManagerOptions(options, environment);

        configuration.AddSystemsManager(source =>
        {
            source.Path = options.Path;
            source.Optional = options.Optional;
            source.ReloadAfter = TimeSpan.FromMinutes(Math.Max(1, options.ReloadAfterMinutes));
        });
    }

    public static void ValidateProductionSecretSource(this IConfiguration configuration, IHostEnvironment environment)
    {
        var options = configuration.GetSection("AWS:SystemsManager").Get<AwsSystemsManagerOptions>() ?? new AwsSystemsManagerOptions();
        if (!environment.IsDevelopment() && !options.Enabled)
        {
            throw new InvalidOperationException("AWS:SystemsManager:Enabled must be true outside Development.");
        }
    }

    private static void ValidateSystemsManagerOptions(AwsSystemsManagerOptions options, IHostEnvironment environment)
    {
        if (string.IsNullOrWhiteSpace(options.Path))
        {
            throw new InvalidOperationException("AWS:SystemsManager:Path is required when AWS Systems Manager configuration is enabled.");
        }

        if (!environment.IsDevelopment() && options.Optional)
        {
            throw new InvalidOperationException("AWS:SystemsManager:Optional must be false outside Development.");
        }
    }
}
