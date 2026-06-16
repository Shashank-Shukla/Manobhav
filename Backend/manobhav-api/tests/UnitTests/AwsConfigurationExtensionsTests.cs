using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using WebApi.Configuration;

namespace UnitTests;

public sealed class AwsConfigurationExtensionsTests
{
    [Fact]
    public void ValidateProductionSecretSource_RequiresSystemsManagerOutsideDevelopment()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AWS:SystemsManager:Enabled"] = "false"
            })
            .Build();

        var exception = Assert.Throws<InvalidOperationException>(() =>
            configuration.ValidateProductionSecretSource(new TestHostEnvironment("Production")));

        Assert.Contains("AWS:SystemsManager:Enabled", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void AddConfiguredSystemsManager_RequiresPathWhenEnabled()
    {
        var configuration = new ConfigurationManager();
        configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AWS:SystemsManager:Enabled"] = "true",
            ["AWS:SystemsManager:Path"] = ""
        });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            configuration.AddConfiguredSystemsManager(new TestHostEnvironment("Production")));

        Assert.Contains("AWS:SystemsManager:Path", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void AddConfiguredSystemsManager_RequiresNonOptionalProductionSource()
    {
        var configuration = new ConfigurationManager();
        configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AWS:SystemsManager:Enabled"] = "true",
            ["AWS:SystemsManager:Path"] = "/manobhav/prod/",
            ["AWS:SystemsManager:Optional"] = "true"
        });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            configuration.AddConfiguredSystemsManager(new TestHostEnvironment("Production")));

        Assert.Contains("AWS:SystemsManager:Optional", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void AddConfiguredSystemsManager_DoesNothingWhenDisabled()
    {
        var configuration = new ConfigurationManager();
        configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AWS:SystemsManager:Enabled"] = "false"
        });

        configuration.AddConfiguredSystemsManager(new TestHostEnvironment("Development"));
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public TestHostEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }

        public string ApplicationName { get; set; } = "UnitTests";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
